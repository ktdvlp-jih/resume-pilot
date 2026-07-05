# API·빌드 스모크

`resume-pilot-api-smoke` 스킬을 따른다.

1. `resume-api`: `.\gradlew.bat compileJava`
2. `resume-web` / `resume-admin`: `npm run build`
3. API health · signup/login · Swagger (`/swagger-ui.html`)
4. AI docs (`:8000/docs`, `:8001/docs`, `:8002/docs`) 응답 확인
5. 실패·블로커만 짧게 보고

커밋·push는 사용자가 요청할 때만.
