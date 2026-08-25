-- 기존 7일 refresh 세션을 즉시 만료시킨다. 이후 발급분은 24시간(로그인 시각 기준)이다.
UPDATE refresh_tokens SET revoked = true WHERE revoked = false;
