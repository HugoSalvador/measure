#!/bin/sh

until nc -z -v -w30 $DATABASE_HOST $DATABASE_PORT
do
  echo "Waiting for database connection..."
  sleep 1
done

echo "Database is up - executing command"
npm run run-migrations && npm run start