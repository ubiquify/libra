# Libra

_Concept_

Browser based, client centric media application.

- privacy-first
- data-centric
- serverless
- cloudless

The media stays in the browser (IndexedDB). Media collections can be shared with other users or apps via relays. Multiple users can collaborate to author a given media collection, history is preserved, conflicts are automatically resolved.

Exposes the functionality inherited from the underlying [@ubiquify/media](https://github.com/ubiquify/media) kernel.

## Share

Run a local [relay](https://github.com/ubiquify/relay) for collaboration.

## SSL

> Note: Browser cryptographic libraries are available only to secure origins (ie. `https://server:port`). To run the app locally, you need to generate a self-signed certificate and configure your browser to trust it.

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
    image: ubiquify/libra:0.0.12
    container_name: libra-server-9503
    ports:
      - "443:9503"
    volumes:
      - type: bind
        source: ./ssl
        target: /app/ssl

  relay-server-3003:
    image: ubiquify/relay:0.0.14
    container_name: relay-server-3003
    ports:
      - "3003:3003"
      - "3000:3000"
    volumes:
      - type: bind
        source: ./ssl
        target: /app/ssl
```

## Licenses

Licensed under either [Apache 2.0](http://opensource.org/licenses/MIT) or [MIT](http://opensource.org/licenses/MIT) at your option.
