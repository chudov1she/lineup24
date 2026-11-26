import fs from 'node:fs'

const path = new URL('../src/app/dashboard/data.json', import.meta.url)
const data = JSON.parse(fs.readFileSync(path, 'utf8'))

const status = {
  Done: 'Готово',
  'In Process': 'В работе',
  'In Progress': 'В работе',
  'Not Started': 'Не начато',
}

const type = {
  'Cover page': 'Титульный лист',
  'Cover Page': 'Титульный лист',
  'Table of contents': 'Оглавление',
  'Table of Contents': 'Оглавление',
  Narrative: 'Описание',
  'Technical content': 'Технический контент',
  'Executive Summary': 'Краткое резюме',
  'Technical Approach': 'Технический подход',
  Design: 'Дизайн',
  Capabilities: 'Возможности',
  'Focus Documents': 'Ключевые документы',
  'Plain language': 'Простой язык',
  Legal: 'Юридическое',
  Visual: 'Визуальное',
  Financial: 'Финансы',
  Research: 'Исследование',
  Planning: 'Планирование',
}

const header = {
  'Cover page': 'Титульный лист',
  'Table of contents': 'Оглавление',
  'Executive summary': 'Краткое резюме',
  'Technical approach': 'Технический подход',
  Design: 'Дизайн',
  Capabilities: 'Возможности',
  'Integration with existing systems': 'Интеграция с существующими системами',
  'Innovation and Advantages': 'Инновации и преимущества',
  "Overview of EMR's Innovative Solutions": 'Обзор инновационных решений EMR',
  'Advanced Algorithms and Machine Learning':
    'Продвинутые алгоритмы и машинное обучение',
  'Adaptive Communication Protocols': 'Адаптивные протоколы связи',
  'Prior Art and Competitive Landscape': 'Патентный поиск и конкурентная среда',
  'Feature 1: Real-time Data Sync':
    'Функция 1: синхронизация в реальном времени',
  'Feature 2: Offline Mode': 'Функция 2: офлайн-режим',
  'Feature 3: Multi-platform Support': 'Функция 3: мультиплатформенность',
  'Security Architecture': 'Архитектура безопасности',
  'Performance Benchmarks': 'Бенчмарки производительности',
  'Scalability Considerations': 'Масштабируемость',
  'User Experience Design': 'UX-дизайн',
  'Accessibility Features': 'Доступность',
  'Documentation Standards': 'Стандарты документации',
  'Testing Strategy': 'Стратегия тестирования',
  'Deployment Plan': 'План развёртывания',
  'Risk Assessment': 'Оценка рисков',
  'Budget Overview': 'Обзор бюджета',
  'Timeline and Milestones': 'Сроки и вехи',
  'Team Structure': 'Структура команды',
  'Quality Assurance': 'Обеспечение качества',
  'Customer Support Plan': 'План поддержки клиентов',
  'Training Materials': 'Обучающие материалы',
  'API Documentation': 'Документация API',
  'Database Schema': 'Схема базы данных',
  'Network Architecture': 'Сетевая архитектура',
  'Monitoring and Logging': 'Мониторинг и логирование',
  'Disaster Recovery': 'Аварийное восстановление',
  'Compliance Requirements': 'Требования соответствия',
  'Future Roadmap': 'Дорожная карта',
  Conclusion: 'Заключение',
  'Appendix A': 'Приложение A',
  'Appendix B': 'Приложение B',
  References: 'Источники',
  Glossary: 'Глоссарий',
  'Change Log': 'Журнал изменений',
  Approvals: 'Согласования',
  'Advantages Over Current Technologies': 'Преимущества над текущими технологиями',
  'Past Performance': 'Прошлые результаты',
  'Customer Feedback and Satisfaction Levels':
    'Обратная связь и уровень удовлетворённости',
  'Implementation Challenges and Solutions':
    'Сложности внедрения и решения',
  'Security Measures and Data Protection Policies':
    'Меры безопасности и защита данных',
  'Scalability and Future Proofing': 'Масштабируемость и запас на будущее',
  'Cost-Benefit Analysis': 'Анализ затрат и выгод',
  'User Training and Onboarding Experience':
    'Обучение пользователей и онбординг',
  'Future Development Roadmap': 'Дорожная карта развития',
  'System Architecture Overview': 'Обзор архитектуры системы',
  'Risk Management Plan': 'План управления рисками',
  'Compliance Documentation': 'Документация по соответствию',
  'User Interface Mockups': 'Макеты интерфейса',
  'Testing Methodology': 'Методология тестирования',
  'Deployment Strategy': 'Стратегия развёртывания',
  'Budget Breakdown': 'Разбивка бюджета',
  'Market Analysis': 'Анализ рынка',
  'Competitor Comparison': 'Сравнение с конкурентами',
  'Maintenance Plan': 'План обслуживания',
  'User Personas': 'Пользовательские персоны',
  'Accessibility Compliance': 'Соответствие требованиям доступности',
  'Performance Metrics': 'Метрики производительности',
  'Disaster Recovery Plan': 'План аварийного восстановления',
  'Third-party Integrations': 'Интеграции со сторонними сервисами',
  'User Feedback Summary': 'Сводка отзывов пользователей',
  'Localization Strategy': 'Стратегия локализации',
  'Mobile Compatibility': 'Совместимость с мобильными',
  'Data Migration Plan': 'План миграции данных',
  'Quality Assurance Protocols': 'Протоколы обеспечения качества',
  'Stakeholder Analysis': 'Анализ стейкхолдеров',
  'Environmental Impact Assessment': 'Оценка влияния на окружение',
  'Intellectual Property Rights': 'Права интеллектуальной собственности',
  'Customer Support Framework': 'Фреймворк поддержки клиентов',
  'Version Control Strategy': 'Стратегия контроля версий',
  'Continuous Integration Pipeline': 'Пайплайн непрерывной интеграции',
  'Regulatory Compliance': 'Регуляторное соответствие',
  'User Authentication System': 'Система аутентификации',
  'Data Analytics Framework': 'Фреймворк аналитики данных',
  'Cloud Infrastructure': 'Облачная инфраструктура',
  'Network Security Measures': 'Меры сетевой безопасности',
  'Project Timeline': 'Таймлайн проекта',
  'Resource Allocation': 'Распределение ресурсов',
  'Team Structure and Roles': 'Структура команды и роли',
  'Communication Protocols': 'Протоколы коммуникации',
  'Success Metrics': 'Метрики успеха',
  'Internationalization Support': 'Поддержка интернационализации',
  'Backup and Recovery Procedures': 'Процедуры резервного копирования',
  'Monitoring and Alerting System': 'Система мониторинга и алертов',
  'Code Review Guidelines': 'Правила код-ревью',
  'Release Management Process': 'Процесс управления релизами',
  'Feature Prioritization Matrix': 'Матрица приоритетов функций',
  'Technical Debt Assessment': 'Оценка технического долга',
  'Capacity Planning': 'Планирование мощности',
  'Service Level Agreements': 'Соглашения об уровне сервиса',
}

const reviewer = {
  'Assign reviewer': 'Назначить рецензента',
  'Eddie Lake': 'Эдди Лейк',
  'Jamik Tashpulatov': 'Джамик Ташпулатов',
  'Emily Whalen': 'Эмили Уэйлен',
}

for (const row of data) {
  row.status = status[row.status] ?? row.status
  row.type = type[row.type] ?? row.type
  row.header = header[row.header] ?? row.header
  row.reviewer = reviewer[row.reviewer] ?? row.reviewer
}

fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)

const leftover = data.filter(
  (r) =>
    /[A-Za-z]{4,}/.test(r.header) ||
    /[A-Za-z]{4,}/.test(r.type) ||
    /[A-Za-z]{3,}/.test(r.status),
)
console.log(`translated ${data.length} rows, leftover headers/types=${leftover.length}`)
if (leftover.length) {
  console.log(leftover.map((r) => ({ header: r.header, type: r.type })))
}
