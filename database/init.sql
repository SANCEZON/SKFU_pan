-- Этот файл выполняется автоматически при первом запуске MySQL контейнера
-- См. docker-compose.yml volume: ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

SOURCE /docker-entrypoint-initdb.d/schema.sql;

