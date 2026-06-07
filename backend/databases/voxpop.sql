DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS map_hubs;
DROP TABLE IF EXISTS match_events;

CREATE TABLE map_hubs (
    id SERIAL PRIMARY KEY,
    city VARCHAR(50) NOT NULL,
    country VARCHAR(30) NOT NULL,
    hub_name VARCHAR(100) NOT NULL,
    hub_type VARCHAR(20) NOT NULL,
    center_x FLOAT NOT NULL,
    center_z FLOAT NOT NULL
);

CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    age INT NOT NULL,
    country VARCHAR(50) NOT NULL,
    archetype VARCHAR(50) NOT NULL,
    traits TEXT[] NOT NULL,
    current_city VARCHAR(50) NOT NULL,
    current_hub_id INT REFERENCES map_hubs(id),
    pos_x FLOAT DEFAULT 0.0,
    pos_z FLOAT DEFAULT 0.0,
    target_x FLOAT DEFAULT 0.0,
    target_z FLOAT DEFAULT 0.0,
    speed FLOAT DEFAULT 0.08,
    current_mood_intensity INT DEFAULT 50,
    status_activity VARCHAR(100) DEFAULT 'Waiting for kickoff',
    memories TEXT[] DEFAULT '{}'::TEXT[],
    current_goal VARCHAR(100) DEFAULT 'Explore', -- ADDED THIS
    last_speech VARCHAR(280) DEFAULT '...'       -- ADDED THIS
);

CREATE TABLE match_events (
    id SERIAL PRIMARY KEY,
    country_a VARCHAR(50) NOT NULL,
    country_b VARCHAR(50) NOT NULL,
    winner VARCHAR(50),
    match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_description TEXT
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
    content VARCHAR(280) NOT NULL,
    posted_at_tick INT NOT NULL,
    city_context VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO map_hubs (city, country, hub_name, hub_type, center_x, center_z) VALUES
('Toronto', 'Canada', 'BMO Field', 'stadium', -20, 20),
('Vancouver', 'Canada', 'BC Place', 'stadium', -25, 25),
('Mexico City', 'Mexico', 'Estadio Azteca', 'stadium', 20, 20),
('Guadalajara', 'Mexico', 'Estadio Akron', 'stadium', 20, 10),
('Monterrey', 'Mexico', 'Estadio BBVA', 'stadium', 20, 0),
('Atlanta', 'USA', 'Mercedes-Benz Stadium', 'stadium', 0, -10),
('Boston', 'USA', 'Gillette Stadium', 'stadium', 5, -5),
('Dallas', 'USA', 'AT&T Stadium', 'stadium', 0, 0),
('Houston', 'USA', 'NRG Stadium', 'stadium', 0, -5),
('Kansas City', 'USA', 'Arrowhead Stadium', 'stadium', -5, -5),
('Los Angeles', 'USA', 'SoFi Stadium', 'stadium', -15, -10),
('Miami', 'USA', 'Hard Rock Stadium', 'stadium', 10, -15),
('New York/NJ', 'USA', 'MetLife Stadium', 'stadium', 5, -10),
('Philadelphia', 'USA', 'Lincoln Financial Field', 'stadium', 5, -8),
('San Francisco', 'USA', 'Levi''s Stadium', 'stadium', -15, -5),
('Seattle', 'USA', 'Lumen Field', 'stadium', -15, 0);