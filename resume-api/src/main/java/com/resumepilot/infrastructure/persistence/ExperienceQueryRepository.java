package com.resumepilot.infrastructure.persistence;

import com.querydsl.jpa.impl.JPAQueryFactory;
import com.resumepilot.domain.experience.Experience;
import com.resumepilot.domain.experience.ExperienceType;
import com.resumepilot.domain.experience.QExperience;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ExperienceQueryRepository {

    private final JPAQueryFactory queryFactory;

    public List<Experience> findByUserIdWithOptionalType(UUID userId, ExperienceType type) {
        QExperience e = QExperience.experience;
        var query = queryFactory.selectFrom(e).where(e.userId.eq(userId));
        if (type != null) {
            query = query.where(e.type.eq(type));
        }
        return query.orderBy(e.updatedAt.desc()).fetch();
    }
}
