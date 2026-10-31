# ansible-infra-cd
ArgoCD+ConfigMonitor like website to keep track of your infra.aap_configuration Config as Code and live AAP/AWX instance configurations. Sync, prune, visualize, and more. Built with Django+PatternFly.

## Quick start

```bash
make up          # builds and starts web, worker, beat, postgres and redis (Podman Compose)
make superuser   # create your login
make seed        # optional demo data
```

Open http://localhost:8000. See [PROJECT_STARTER_README.md](PROJECT_STARTER_README.md) for architecture, decisions, and the roadmap.
