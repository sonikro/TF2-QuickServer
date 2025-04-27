FROM scratch AS maps
COPY ./maps /maps

FROM sonikro/tf2-passtime:latest
COPY --from=maps --chown=tf2:tf2 /maps /home/tf2/server/tf/maps