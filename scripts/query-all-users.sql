-- Query para listar todos os usuários do banco com suas principais informações

SELECT 
  p.id,
  p.full_name AS "Nome Completo",
  a.email AS "Email",
  p.role AS "Papel",
  d.name AS "Departamento",
  p.created_at AS "Data Criação",
  p.updated_at AS "Última Atualização"
FROM 
  profiles p
LEFT JOIN 
  auth.users a ON p.id = a.id
LEFT JOIN 
  departments d ON p.department_id = d.id
ORDER BY 
  p.created_at DESC;

-- Contagem total de usuários
SELECT COUNT(*) AS "Total de Usuários" FROM profiles;

-- Usuários por papel
SELECT 
  role AS "Papel",
  COUNT(*) AS "Quantidade"
FROM 
  profiles
GROUP BY 
  role
ORDER BY 
  "Quantidade" DESC;

-- Usuários por departamento
SELECT 
  d.name AS "Departamento",
  COUNT(p.id) AS "Quantidade de Usuários"
FROM 
  profiles p
LEFT JOIN 
  departments d ON p.department_id = d.id
GROUP BY 
  d.name
ORDER BY 
  "Quantidade de Usuários" DESC;
