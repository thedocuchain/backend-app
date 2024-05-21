## Environment variables
```bash
# copy from example
$ cp .env.example .env

# setup DATABASE_PASSWORD
$ nano .env
```
## Running the app in Docker

```bash
$ docker-compose up -d
```

## Running the database migrations 

```bash
$ docker exec -it backend-app npm run typeorm:run-migrations
```
