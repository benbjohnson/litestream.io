---
title : "Replicating to a WebDAV Server"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 470
---

This guide will show you how to use Litestream to replicate to a remote WebDAV
server. WebDAV is a widely-supported protocol that allows you to store backups
on services like Nextcloud, ownCloud, or any RFC 4918 compliant WebDAV server.


## Usage

### Command line usage

You can specify your WebDAV replica using a replica URL on the command line.
For example, you can replicate a database to a WebDAV server with the following
command. _Replace the placeholders with your username, password, server, & path._

```sh
litestream replicate /path/to/db webdav://USER:PASSWORD@HOST/PATH
```

For HTTPS connections (recommended for production), use the `webdavs://` scheme:

```sh
litestream replicate /path/to/db webdavs://USER:PASSWORD@HOST/PATH
```

You can later restore your database from WebDAV to a local `my.db` path with
the following command:

```sh
litestream restore -o my.db webdavs://USER:PASSWORD@HOST/PATH
```


### Configuration file usage

Litestream is typically run as a background service which uses a [configuration
file][]. You can configure a replica for your database using the `url` format:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: webdavs://USER:PASSWORD@HOST/PATH
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:           webdav
      webdav-url:     https://example.com/webdav
      webdav-username: USER
      webdav-password: PASSWORD
      path:           /litestream/backups
```

Using environment variables for credentials is recommended:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:            webdav
      webdav-url:      https://example.com/webdav
      webdav-username: ${WEBDAV_USERNAME}
      webdav-password: ${WEBDAV_PASSWORD}
      path:            /litestream/backups
```


## URL schemes

WebDAV replicas support two URL schemes:

- `webdav://` — HTTP (not recommended for production)
- `webdavs://` — HTTPS (recommended for production)

Always use `webdavs://` in production to encrypt data in transit.


## Supported WebDAV servers

The following servers are tested and fully supported:

- **Nextcloud** — See [Nextcloud setup](#nextcloud-setup) below
- **ownCloud** — Similar configuration to Nextcloud
- **Apache mod_dav** — Standard WebDAV module for Apache

The following servers are expected to work with any RFC 4918 compliant WebDAV
implementation:

- Nginx with ngx_http_dav_module
- Caddy with webdav plugin
- Synology NAS WebDAV Server
- Other self-hosted WebDAV servers


## Nextcloud setup

Nextcloud provides WebDAV access to your files. To configure Litestream with
Nextcloud:

### 1. Create an app password

For security and performance, use an app password instead of your main account
password:

1. Log into your Nextcloud instance
2. Go to **Settings** → **Security** → **Devices & sessions**
3. Enter a name like "Litestream" and click **Create new app password**
4. Save the generated password securely

### 2. Find your WebDAV URL

The WebDAV URL format for Nextcloud is:

```
https://your-nextcloud.com/remote.php/dav/files/USERNAME/
```

You can also find this URL in Nextcloud by clicking the gear icon in the
lower-left corner of the Files app.

### 3. Configure Litestream

Create a backup directory in Nextcloud (e.g., `litestream-backups`), then
configure Litestream:

```yaml
dbs:
  - path: /var/lib/myapp.db
    replica:
      type:            webdav
      webdav-url:      https://cloud.example.com/remote.php/dav/files/myuser
      webdav-username: ${NEXTCLOUD_USERNAME}
      webdav-password: ${NEXTCLOUD_APP_PASSWORD}
      path:            /litestream-backups
```

Set your environment variables before starting Litestream:

```sh
export NEXTCLOUD_USERNAME="myuser"
export NEXTCLOUD_APP_PASSWORD="xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
litestream replicate -config /etc/litestream.yml
```


## ownCloud setup

ownCloud uses the same WebDAV URL format as Nextcloud:

```
https://your-owncloud.com/remote.php/dav/files/USERNAME/
```

Follow the same steps as Nextcloud to create an app password and configure
Litestream.


## Security best practices

1. **Always use HTTPS** — Use the `webdavs://` scheme to encrypt data in transit
2. **Use environment variables** — Never commit credentials to configuration files
3. **Use app-specific passwords** — For Nextcloud/ownCloud, create dedicated app
   passwords rather than using your main account password
4. **Restrict permissions** — Litestream only needs write access to its backup
   directory; limit access accordingly


## Troubleshooting

### Connection errors

- **"webdav url required"** — The WebDAV URL is not specified in the configuration
- **"cannot connect to server"** — Verify the URL, check network connectivity
  and firewall rules
- **Authentication failures** — Verify username and password; check server logs
  for details
- **TLS/SSL errors** — Ensure the server certificate is valid; use `webdavs://`
  for HTTPS

### Testing connectivity

You can test WebDAV connectivity using curl:

```sh
curl -u username:password https://example.com/webdav/
```

### Debug logging

Enable debug logging in Litestream to see detailed request information:

```yaml
logging:
  level: debug
```


[configuration file]: /reference/config
