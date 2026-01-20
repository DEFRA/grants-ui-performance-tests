FROM grafana/k6

COPY scenarios/ ./scenarios/
COPY entrypoint.sh .

ENV S3_ENDPOINT=https://s3.eu-west-2.amazonaws.com
ENV K6_WEB_DASHBOARD=true
ENV K6_WEB_DASHBOARD_EXPORT=/reports/report.html

USER root
RUN mkdir -p /reports
RUN chown -R k6:k6 /reports
VOLUME reports

USER k6

ENTRYPOINT [ "./entrypoint.sh" ]
