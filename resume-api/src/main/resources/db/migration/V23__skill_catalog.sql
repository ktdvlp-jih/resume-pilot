CREATE TABLE skill_catalog (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_catalog_category ON skill_catalog (category);

INSERT INTO skill_catalog (name, category) VALUES
('Java', 'Backend'), ('Kotlin', 'Backend'), ('Spring', 'Backend'), ('Spring Boot', 'Backend'),
('Spring Security', 'Backend'), ('Spring Data JPA', 'Backend'), ('QueryDSL', 'Backend'),
('MyBatis', 'Backend'), ('Node.js', 'Backend'), ('Express', 'Backend'), ('NestJS', 'Backend'),
('Python', 'Backend'), ('Django', 'Backend'), ('FastAPI', 'Backend'), ('Go', 'Backend'),
('C#', 'Backend'), ('.NET', 'Backend'), ('PHP', 'Backend'), ('Laravel', 'Backend'),
('Ruby on Rails', 'Backend'),
('JavaScript', 'Frontend'), ('TypeScript', 'Frontend'), ('HTML5', 'Frontend'), ('CSS3', 'Frontend'),
('React', 'Frontend'), ('Vue.js', 'Frontend'), ('Angular', 'Frontend'), ('Next.js', 'Frontend'),
('Nuxt.js', 'Frontend'), ('jQuery', 'Frontend'), ('Tailwind CSS', 'Frontend'), ('Redux', 'Frontend'),
('TanStack Query', 'Frontend'), ('Vite', 'Frontend'), ('Webpack', 'Frontend'),
('MySQL', 'Database'), ('PostgreSQL', 'Database'), ('MariaDB', 'Database'),
('Microsoft SQL Server', 'Database'), ('Oracle', 'Database'), ('MongoDB', 'Database'),
('Redis', 'Database'), ('Elasticsearch', 'Database'), ('pgvector', 'Database'), ('DynamoDB', 'Database'),
('Docker', 'Infra/DevOps'), ('Kubernetes', 'Infra/DevOps'), ('AWS', 'Infra/DevOps'),
('GCP', 'Infra/DevOps'), ('Azure', 'Infra/DevOps'), ('Jenkins', 'Infra/DevOps'),
('GitHub Actions', 'Infra/DevOps'), ('GitLab CI', 'Infra/DevOps'), ('Terraform', 'Infra/DevOps'),
('Nginx', 'Infra/DevOps'), ('Linux', 'Infra/DevOps'),
('LangChain', 'AI/Data'), ('OpenAI API', 'AI/Data'), ('RAG', 'AI/Data'),
('TensorFlow', 'AI/Data'), ('PyTorch', 'AI/Data'), ('Pandas', 'AI/Data'), ('NumPy', 'AI/Data'),
('Git', 'Tools'), ('GitHub', 'Tools'), ('GitLab', 'Tools'), ('SourceTree', 'Tools'),
('Jira', 'Tools'), ('Confluence', 'Tools'), ('Postman', 'Tools'), ('Figma', 'Tools');
