FROM hmctspublic.azurecr.io/base/node:20-alpine as base

USER hmcts

COPY --chown=hmcts:hmcts .yarn ./.yarn
COPY --chown=hmcts:hmcts .yarnrc.yml ./
COPY --chown=hmcts:hmcts . .
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"


# ---- Build image ----
FROM base as build
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# ---- Runtime image ----
FROM base as runtime
COPY --from=build $WORKDIR/api ./api
COPY --from=build $WORKDIR/socket.ts $WORKDIR/app.ts $WORKDIR/server.ts ./

EXPOSE 8080
