-- Separate database for the integration test suite, so tests can truncate
-- tables freely without touching development data.
CREATE DATABASE car_dealership_test;
