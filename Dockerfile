FROM gcr.io/distroless/base-debian12:nonroot

WORKDIR /app
COPY --chown=65532:65532 build/native/nativeCompile/wannianli-api /app/wannianli-api

EXPOSE 8080
USER 65532:65532

ENTRYPOINT ["/app/wannianli-api"]
