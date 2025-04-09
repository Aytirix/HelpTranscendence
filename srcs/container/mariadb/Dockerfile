FROM mariadb:latest

COPY start.sh /tmp/start.sh
COPY init.sql /tmp/init.sql
RUN chmod +x /tmp/start.sh

ENTRYPOINT ["/tmp/start.sh"]
