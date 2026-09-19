# Deployment

Kustomize base in `base/`, one overlay per cluster in `overlays/development`, `overlays/test`, `overlays/production`.
The GitHub workflows run `kustomize build <overlay> | kubectl apply -n wallet-api`; nothing else templates the manifests.

## Secrets

The deployment reads every secret by name (`secretKeyRef`). No value lives in this repository in clear text.

`ACTION_TOKEN_SECRET` (Secret `treetracker-wallet-action-token`, key `secret`) signs share links and is provided as a
[Sealed Secret](https://github.com/bitnami/sealed-secrets) committed in each overlay. The `sealed-secrets-controller`
in `kube-system` of that cluster decrypts it into the real Secret; no other cluster can. A sealed file is bound to its
cluster, namespace and name, so each overlay needs its own.

Generate one for a cluster. The value is created inside the pipe and is never displayed or written in clear:

    kubectl --context <ctx> -n wallet-api create secret generic treetracker-wallet-action-token --from-literal=secret="$(openssl rand -base64 48)" --dry-run=client -o yaml | kubeseal --context <ctx> --controller-name sealed-secrets-controller --controller-namespace kube-system --format yaml > overlays/<env>/treetracker-wallet-action-token-sealed-secret.yaml

Then list the file under `resources:` in that overlay's `kustomization.yaml` (development already does).

Rotation: run the same command again, commit, deploy, then
`kubectl rollout restart deployment/treetracker-wallet-api-keycloak -n wallet-api`, because env values are read once
at container start. Every outstanding share link stops verifying after a rotation.

The other secrets in the namespace (`treetracker-wallet-jwt-keys`, `treetracker-api-database-connection`, `aws-s3`)
predate this and were created by hand. Converting them is a separate task.
