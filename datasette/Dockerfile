FROM datasetteproject/datasette

RUN pip install --no-cache-dir \
    datasette-auth-passwords

RUN mkdir -p /etc/datasette

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
