build-prod:
	docker buildx build --platform linux/amd64 --no-cache -t docuchain-backend:latest --target production .
