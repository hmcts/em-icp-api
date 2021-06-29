FROM hmctspublic.azurecr.io/base/node:12-alpine as base

USER hmcts

COPY --chown=hmcts:hmcts . .
RUN yarn install --production \
  && yarn cache clean

# ---- Build image ----
FROM base as build
RUN yarn install --production  \
    && yarn cache clean

# ---- Runtime image ----
FROM base as runtime
COPY --from=build $WORKDIR/api ./api
COPY --from=build $WORKDIR/socket.ts $WORKDIR/app.ts $WORKDIR/server.ts ./

EXPOSE 8080
