---
title: "Talking to the machine"
description: ""
pubDate: "Aug 15 2025"
# updatedDate: "Aug 15 2025"
# heroImage: "../../assets/blog-placeholder-3.jpg"
---

I'm forming some ideas around building personal productivity tools powered by LLMs. These ideas are still pretty raw. I'm not entirely sure what will work and what won't. Or even what is possible. And if the possibilities are unknown, they may as well be endless. And having _endless possibilities_ is very encouraging!

I'm going to start experimenting with myself on my own productivity. But before I do that, I'm going to need to figure out how to integrate with an LLM.

---

## **Integrating with an LLM**

I've chosen to integrate with the OpenAI API first. I think it's a good choice because numerous LLM providers support OpenAI compatibility including OpenRouter, Moonshot, and LMStudio.

We pass in a list of messages. We’re starting with a single message. There’s a role field we’ll take another look at in a minute. For now we’ll use the user role. This is sometimes called a single-turn chat.

```rust
// main.rs
use serde_json::{Value, json};

#[tokio::main]
async fn main() {
    let api_key = std::env::var("OPENAI_API_KEY")
        .expect("You need to set the OPENAI_API_KEY environment variable first.");
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&json!({
            "model": "gpt-5-nano",
            "messages": [
                {
                    "role": "user",
                    "content": "Tell me a joke."
                }
            ]
        }))
        .send()
        .await
        .expect("Failed to send request")
        .json::<Value>()
        .await
        .expect("Failed to parse response");

    println!("{response}");
}

```

Now let's run this, and see what happens

```json
> cargo run | jq
{
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "annotations": [],
        "content": "Here's a joke for you:\nWhy don't scientists trust atoms? Because they make up everything.",
        "refusal": null,
        "role": "assistant"
      }
    }
  ],
  "created": 1755719707,
  "id": "chatcmpl-C6jBj7HL7eOwbQ7ObgamKlXM0nRdW",
  "model": "gpt-5-nano-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 347,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 320,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens": 11,
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    },
    "total_tokens": 358
  }
}
```

Nice! We're sending a message and getting back a response from the model.

## Accepting a message as an argument

We have the beginnings of something here, but it's not very useful yet. Let's add support for a --message command line argument.

We'll just update the code to parse the arguments and then pass that message value into our request:

```rust
use clap::Parser;

#[derive(Parser)]
struct Args {
    #[arg(short, long)]
    message: Option<String>,
}

#[tokio::main]
fn main() {
    let args = Args::parse();
    let message = args.message.expect("No message provided");
    // ...
    // and send it along with the request
    "messages": [
        {
            "role": "user",
            "content": message,
        }
    // ...
}
```

And let's try it out:

```sh
> cargo run -- -m "Give me an aphorism" | jq '.choices[0].message.content'
> "Change is the only constant."
```

Hey that's a good one! Also, this is a big improvement! Now we're able to dynamically pass in messages.

##

## Reading from stdin

Let's take this a step further. In addition to accepting a message as an argument, I think it would be handy to also read from stdin.

We'll keep support for the command line argument and combine it with what we read from stdin. The logic will look like this:

- If both stdin and the argument are present, the input is argument + stdin
- If only one is present, that becomes the input
- If neither is present, we error out

In order to support both optionally, we'll need to determine if `stdin` is a `tty`. If it were, this would mean we haven't piped or redirected anything. If this is the case, we don't want to read from `stdin`; We want to fallback to the argument. To check this, we use the `atty` crate.

```rust
let mut stdin_buffer = String::new();
if !atty::is(atty::Stream::Stdin) {
    // Stdin is not an interactive TTY so read it fully
    std::io::stdin()
        .read_to_string(&mut stdin_buffer)
        .expect("Failed to read stdin");
    }

let message = match (args.message, stdin_buffer) {
    (Some(mut msg), stdin_data) if !stdin_data.trim().is_empty() => {
        msg.push_str(&stdin_data);
        msg
    }
    (Some(msg), _) => msg,
    (None, stdin_data) if !stdin_data.trim().is_empty() => stdin_data,
    (None, _) => {
        panic!("No input provided. Use stdin and/or -m/--message flag");
    }
};
```

And now let's test it by piping in some yaml and asking the model to convert it to json for us:

```sh
> cat foo.yaml
users:
  - id: 1
    name: "Alice Johnson"
    email: "alice@example.com"
    active: true
  - id: 2
    name: "Bob Smith"
    email: "bob@example.com"
    active: false
```

```sh
> cat foo.yaml | cargo run -- -m "convert this file to json"  | jq -r '.choices[0].message.content' > foo.json
> cat foo.json
Here are the JSON representations of the data.

Option 1: plain JSON array
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "active": true
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "active": false
  }
]

Option 2: JSON object with a "users" field
{
  "users": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "active": true
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "email": "bob@example.com",
      "active": false
    }
  ]
}
```

Okay! We parse the output with `jq` and redirect the response into a new file `foo.json`. The file isn't valid json, but we're getting close! The issue now is that the LLM wants to have a conversation but we just want an answer. No fluff. Just minimal output.

## Giving some instruction

We can use a **system prompt** (aka _instructions)_ to tell the model to tone it down with all the chatter. We do this by adding another message to our request body with the `role` set to `system`. These instructions will take precedence over any other messages that we send. The complete messages array now looks like this:

```rust
"messages": [
  {
    "role": "system",
    "content":
      "You are a silent answer engine. Output only the correct answer, nothing else."
  },
  {
    "role": "user",
    "content": message,
  }
]
```

 With the system prompt added, let's try running it again.

```json
> cat foo.yaml \
  | cargo run -- -m "convert this file to json" \
  | jq -r '.choices[0].message.content' > foo.json
> cat foo.json
{
  "users": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "active": true
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "email": "bob@example.com",
      "active": false
    }
  ]
}
```

Perfect! I think this is going to be incredibly useful. So useful, in fact, that I bet there already exist thousands of more powerful alternatives available to `brew install`. I honestly didn't check. I'm going to use this one.

I'll come back later with an update that includes a link to the full source code.
