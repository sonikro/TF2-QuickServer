FROM scratch AS maps
COPY ./maps /maps

FROM ghcr.io/tf2pickup-org/tf2-gameserver:latest

COPY --from=maps --chown=tf2:tf2 /maps $SERVER_DIR/tf/maps
COPY --chown=tf2:tf2 ./variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg
COPY --chown=tf2:tf2 ./variants/base/tf/cfg/* $SERVER_DIR/tf/cfg/
COPY --chown=tf2:tf2 ./variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]