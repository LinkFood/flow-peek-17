package com.naturalflow.repo;

import com.naturalflow.model.OptionFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Repository
public interface FlowRepository extends JpaRepository<OptionFlow, Long> {

    /**
     * Get latest N rows for an underlying symbol, ordered by timestamp descending
     */
    List<OptionFlow> findByUnderlyingOrderByTsUtcDesc(String underlying, org.springframework.data.domain.Pageable pageable);

    /**
     * Get rows for an underlying within a time window
     */
    @Query("SELECT f FROM OptionFlow f WHERE f.underlying = :underlying AND f.tsUtc >= :startTime ORDER BY f.tsUtc DESC")
    List<OptionFlow> findByUnderlyingAndTimeWindow(
        @Param("underlying") String underlying,
        @Param("startTime") Instant startTime
    );

    /**
     * Get rows above a premium threshold
     */
    @Query("SELECT f FROM OptionFlow f WHERE f.underlying = :underlying AND f.premium >= :minPremium AND f.tsUtc >= :startTime ORDER BY f.tsUtc ASC")
    List<OptionFlow> findByUnderlyingAndPremiumThreshold(
        @Param("underlying") String underlying,
        @Param("minPremium") BigDecimal minPremium,
        @Param("startTime") Instant startTime
    );

    /**
     * Get sum of call premium for a symbol within time window
     */
    @Query("SELECT COALESCE(SUM(f.premium), 0) FROM OptionFlow f WHERE f.underlying = :underlying AND f.side = 'CALL' AND f.tsUtc >= :startTime")
    BigDecimal sumCallPremiumByUnderlyingAndTimeWindow(
        @Param("underlying") String underlying,
        @Param("startTime") Instant startTime
    );

    /**
     * Get sum of put premium for a symbol within time window
     */
    @Query("SELECT COALESCE(SUM(f.premium), 0) FROM OptionFlow f WHERE f.underlying = :underlying AND f.side = 'PUT' AND f.tsUtc >= :startTime")
    BigDecimal sumPutPremiumByUnderlyingAndTimeWindow(
        @Param("underlying") String underlying,
        @Param("startTime") Instant startTime
    );

    /**
     * Count flow events for a symbol within time window
     */
    @Query("SELECT COUNT(f) FROM OptionFlow f WHERE f.underlying = :underlying AND f.tsUtc >= :startTime")
    Long countByUnderlyingAndTimeWindow(
        @Param("underlying") String underlying,
        @Param("startTime") Instant startTime
    );

    /**
     * Get distinct tickers seen in the last time window
     */
    @Query("SELECT DISTINCT f.underlying FROM OptionFlow f WHERE f.tsUtc >= :startTime ORDER BY f.underlying")
    List<String> findDistinctUnderlyingSince(@Param("startTime") Instant startTime);
}
