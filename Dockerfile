FROM gcr.io/distroless/base-debian13:nonroot

WORKDIR /app
COPY --chown=65532:65532 build/native/nativeCompile/wannianli-api /app/wannianli-api
COPY licenses/ERFA.txt /licenses/ERFA.txt

EXPOSE 8080
USER 65532:65532

ENTRYPOINT ["/app/wannianli-api"]
