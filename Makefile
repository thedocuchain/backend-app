build-prod:
	docker buildx build --platform linux/amd64 --pull --no-cache -t docuchain-backend:latest --target production .
