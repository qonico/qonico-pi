# QonicoPi
This is a simple device implementation with a simulated measurement per configured channel. It will manage the take ownership process and listen to changes in the DataNode configuration. Once both owner and channel is setup it will start adding records (random) at all configured channels.

## start a docker container
```
npm run docker:build
npm run docker:run
```

## start on a different port
```
npm run docker:build
docker run -p ${PORT}:3001/tcp -d qonico-pi
```

## Get all container urls to use on the client
```
npm run docker:urls
```

## listen to log output from all running containers
```
npm run docker:logs
```

## Stop and remove all running containers (This will stop all containers running on the host)
```
npm run docker:stop:all
npm run docker:rm:all
```

## Related Projects
https://github.com/qonico/qonico-client
https://github.com/qonico/cosmos-iot
https://github.com/qonico/cosmos-client
