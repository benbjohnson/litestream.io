---
title : "Installation"
date: 2021-02-01T00:00:00Z
layout: single
draft: false
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

You should now be able to run `litestream version` to verify it is installed.


## Install from source

Most users should follow the steps above to install prebuilt binaries but you
can also install from source if a binary is not provided for your operating
system or architecture. First, [install the Go toolchain](https://golang.org/dl/).

Next, download the source code and run the following command:

```sh
go install ./cmd/litestream
```

This will install `litestream` into your `$GOPATH/bin` directory.

