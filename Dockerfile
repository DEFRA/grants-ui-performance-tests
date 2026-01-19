FROM grafana/k6

COPY scenarios/ ./scenarios/
COPY entrypoint.sh .

USER root
RUN mkdir -p /reports
RUN chown -R k6:k6 /reports
VOLUME reports

USER k6

ENTRYPOINT [ "./entrypoint.sh" ]
