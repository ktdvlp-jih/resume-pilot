-- Stack Overflow Developer Survey 2024 (survey.stackoverflow.co/2024/technology) 기준 확장
INSERT INTO skill_catalog (name, category) VALUES
('C', 'Backend'), ('C++', 'Backend'), ('Rust', 'Backend'), ('Scala', 'Backend'),
('Elixir', 'Backend'), ('ASP.NET Core', 'Backend'), ('ASP.NET', 'Backend'), ('Flask', 'Backend'),
('Blazor', 'Backend'), ('Quarkus', 'Backend'), ('Ktor', 'Backend'), ('GraphQL', 'Backend'),
('gRPC', 'Backend'), ('RabbitMQ', 'Backend'), ('Apache Kafka', 'Backend'),
('Svelte', 'Frontend'), ('Solid.js', 'Frontend'), ('Astro', 'Frontend'), ('Remix', 'Frontend'),
('Gatsby', 'Frontend'), ('Sass', 'Frontend'),
('Flutter', 'Mobile'), ('React Native', 'Mobile'), ('Swift', 'Mobile'), ('SwiftUI', 'Mobile'),
('Xamarin', 'Mobile'), ('Ionic', 'Mobile'), ('Capacitor', 'Mobile'), ('Android SDK', 'Mobile'),
('SQLite', 'Database'), ('Firebase', 'Database'), ('Cloud Firestore', 'Database'),
('BigQuery', 'Database'), ('Snowflake', 'Database'), ('Cassandra', 'Database'),
('Neo4j', 'Database'), ('CockroachDB', 'Database'), ('Supabase', 'Database'),
('IBM Db2', 'Database'), ('ClickHouse', 'Database'),
('Ansible', 'Infra/DevOps'), ('Podman', 'Infra/DevOps'), ('Vercel', 'Infra/DevOps'),
('Netlify', 'Infra/DevOps'), ('Heroku', 'Infra/DevOps'), ('Digital Ocean', 'Infra/DevOps'),
('Cloudflare', 'Infra/DevOps'), ('OpenShift', 'Infra/DevOps'), ('Prometheus', 'Infra/DevOps'),
('Grafana', 'Infra/DevOps'), ('Helm', 'Infra/DevOps'),
('Scikit-learn', 'AI/Data'), ('Keras', 'AI/Data'), ('Hugging Face Transformers', 'AI/Data'),
('Apache Spark', 'AI/Data'), ('Hadoop', 'AI/Data'), ('OpenCV', 'AI/Data'), ('MLflow', 'AI/Data'),
('Maven', 'Tools'), ('Gradle', 'Tools'), ('Yarn', 'Tools'), ('pnpm', 'Tools'), ('Bun', 'Tools'),
('Notion', 'Tools'), ('Trello', 'Tools'), ('Slack', 'Tools'), ('Swagger', 'Tools')
ON CONFLICT (name) DO NOTHING;
