package com.resumepilot.domain.billing;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "billing_operation_costs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingOperationCost {

    @Id
    @Column(length = 50)
    private String operation;

    @Column(name = "token_cost", nullable = false)
    private int tokenCost;
}
