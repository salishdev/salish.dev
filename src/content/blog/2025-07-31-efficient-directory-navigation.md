---
title: "Effecient Directory Navigation"
description: ""
pubDate: "Aug 04 2025"
# heroImage: "../../assets/blog-placeholder-3.jpg"
---

I'm always looking for ways to improve my workflow. I realized recently that I spend a decent amount of time each day navigating directories on my hard drive. I spent some time looking at ways to cut down on the repetition and landed on the following setup.

### We're going to install a few tools.

```sh
brew install fd fzf zoxide
```

- **[fd](https://github.com/sharkdp/fd)** is a program for finding entries in your filesystem. It's kind of like `find` but more ergonomic.
- **[fzf](https://github.com/junegunn/fzf)** is a command-line fuzzy finder. It allows interactive filtering of pretty much any kind of list.
- **[zoxide](https://github.com/ajeetdsouza/zoxide)** is an alternative to the `cd` command that remembers directories you visit frequently and allows you to quickly navigate to them.

Once those were installed, I added this near the bottom of my `.zshrc`:

```sh
# .zshrc
eval "$(zoxide init --no-cmd zsh)"
```

Zoxide has two functions, one that works kind of like the built in `cd` except it also adds the directory to `zoxide`'s database. And another that brings up an interactive fuzzy finder of the database of recent directories. These are mapped to `z` and `zi` by default. By passing the `--no-cmd` argument, we're telling `zoxide` not to define the `z` and `zi` commands because we're going to customize the behavior a little.

```sh
# .zshrc
j() { __zoxide_z "$(fd -t d | fzf)" }
ji() { __zoxide_zi "$@" }
```

Here `j` uses `fd` to find all directories recursively, and piping that into `fzf` gives us an interactive prompt where we can fuzzy-find the directory we want. Passing that into `__zoxide_z` changes the current directory and adds it to zoxide's database so we can access it later using `ji`.

Now we can type `ji` to interactively fuzzy find a recent directory and quickly change into it. Or, if we're looking for a new directory not yet in the database, we can run `j` to fuzzy find it recursively on the file system. Nice!
