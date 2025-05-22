FROM scratch AS maps
COPY ./maps /maps

FROM sonikro/tf2-standard-competitive:latest
COPY --from=maps --chown=tf2:tf2 /maps $SERVER_DIR/tf/maps
COPY --chown=tf2:tf2 ./variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg