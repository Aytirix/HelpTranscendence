DOCKER_COMPOSE_FILE=srcs/docker-compose.yml
DOCKER_COMPOSE=docker-compose

.PHONY: up down build rebuild logs

up:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build

down:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down --volumes --remove-orphans --rmi all
	docker volume prune -f

stop:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) stop

start:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) start

log api:
	clear
	docker exec -it backend pm2 logs api_transcendence

re: down build up

exec:
	docker exec -it $$(docker ps --format "{{.Names}}" | head -n 1) zsh

logs:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f