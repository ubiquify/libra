# Libra

_Concept_

Browser based, client centric media application.

- privacy-first
- data-centric
- serverless
- cloudless

The media storage is either browser local (IndexedDB) or network local ([@ubiquify/restore](https://github.com/ubiquify/restore)). Media collections can be shared via relays. Multiple users can collaborate to author a given media collection, history is preserved, conflicts are automatically resolved.

_Libra_ offers a user interface to the functionality from the [@ubiquify/media](https://github.com/ubiquify/media) module.

## Network block store

For large media files, a network block store is recommended. The [@ubiquify/restore](https://github.com/ubiquify/restore) module is a good candidate.

## Share

Run a local [relay](https://github.com/ubiquify/relay) for collaboration.

## SSL

> Note: Browser cryptographic libraries are available only to secure origins (ie. `https://server:port`). To run the app locally, you need to generate a self-signed certificate and configure your browser to trust it. That would also include the step to manually open the 3 urls (libra, relay, restore) and accept the certificate.

```sh
cd ssl/
openssl req -nodes -new -x509 -keyout server.key -out server.crt
```

## Build

```sh
npm run clean
npm install
npm run build
```

## Run

```sh
npm start
```

## Bootstrap

Use docker-compose for a quick start. Certificates (`server.key` and `server.crt`) expected in the `./ssl` folder.

```yml
version: "3"
services:
  libra-server-9503:
    image: ubiquify/libra:latest
    container_name: libra-server-9503
    ports:
      - "443:9503"
    volumes:
      - type: bind
        source: ./ssl
        target: /app/ssl

  relay-server-3003:
    image: ubiquify/relay:latest
    container_name: relay-server-3003
    ports:
      - "3003:3003"
      - "3000:3000"
    volumes:
      - type: bind
        source: ./ssl
        target: /app/ssl
        
  restore-server-3009:
    image: ubiquify/restore:latest
    container_name: restore-server-3009
    ports:
      - "3007:3007"
      - "3009:3009"
    volumes:
      - type: bind
        source: ./ssl
        target: /app/ssl
      - type: bind
        source: ./data
        target: /app/data

```

## Licenses

Licensed under either [Apache 2.0](http://opensource.org/licenses/MIT) or [MIT](http://opensource.org/licenses/MIT) at your option.
