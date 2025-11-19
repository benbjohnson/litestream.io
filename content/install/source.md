---
title : "Build from Source"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "install"
weight: 130
---

## Installation

Most users should follow the steps above to install prebuilt binaries but you
can also install from source if a binary is not provided for your operating
system or architecture. First, [install the Go toolchain](https://golang.org/dl/).

Next, download the [source code](https://github.com/benbjohnson/litestream) and
run the following command:

```sh
go install ./cmd/litestream
```

This will install `litestream` into your `$GOPATH/bin` directory.


## Building litestream-vfs (Optional)

The VFS extension provides read-only access to replicated databases directly
from object storage. It requires CGO and is built separately from the main
binary.

### Prerequisites

- CGO toolchain (gcc/clang)
- Go 1.24+

### Build command

```sh
make vfs   # builds dist/litestream-vfs.so (preferred)

# Manual Linux-style build:
CGO_ENABLED=1 go build -tags "vfs,SQLITE3VFS_LOADABLE_EXT" -buildmode=c-archive -o dist/litestream-vfs.a ./cmd/litestream-vfs
gcc -shared -o dist/litestream-vfs.so src/litestream-vfs.c dist/litestream-vfs.a
```

Use `.dylib` (macOS) or `.dll` (Windows) if your platform expects it. See the
[VFS guide](/guides/vfs) for usage and language-specific examples.
