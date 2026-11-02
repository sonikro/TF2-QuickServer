FROM sonikro/fat-tf2-pickup:latest

ARG SOAP_DM_FILE_NAME=soap.zip
ARG SOAP_DM_VERSION=4.4.8
ARG SOAP_DM_URL=https://github.com/sapphonie/SOAP-TF2DM/releases/download/v${SOAP_DM_VERSION}/${SOAP_DM_FILE_NAME}
ARG SOAP_DM_SHA256=86d118708e887643e10ae97eca278f4c4e1ecbb6ad9225a8f013a6f68f08fd2e

RUN \
  wget -nv "${SOAP_DM_URL}" -O "${SOAP_DM_FILE_NAME}" \
  && echo "${SOAP_DM_SHA256}  ${SOAP_DM_FILE_NAME}" | sha256sum -c - \
  && unzip -q -j -o "${SOAP_DM_FILE_NAME}" \
    addons/sourcemod/plugins/soap_tf2dm.smx \
    addons/sourcemod/plugins/soap_tournament.smx \
    -d "${SERVER_DIR}/tf/addons/sourcemod/plugins/" \
  && rm "${SOAP_DM_FILE_NAME}"
