---
title : "Installation"
date: 2021-02-01T00:00:00Z
lastmod: 2021-02-01T00:00:00Z
layout: single
draft: false
images: []
---

Litestream can be run on a variety of operating systems. Installing prebuilt
binaries is the easiest way to get started but you can also install from source
easily as well.


## Mac OS X (Homebrew)

A [Homebrew](https://brew.sh/) tap to is provided to install Litestream in a
single command. After installing Homebrew, run:

```sh
brew install benbjohnson/litestream/litestream
```

You should now be able to run `litestream version` to verify it is installed.


## Linux (Debian)

Debian package files are provided so you can install Litestream and its systemd
service with a few commands. First, download the latest `.deb` file to your
local machine:

```sh
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.1/litestream-v0.3.1-linux-amd64.deb
```

Then install it using `dpkg`:

```sh
sudo dpkg -i litestream-v0.3.1-linux-amd64.deb
```

