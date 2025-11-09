package com.naturalflow.repo;

import com.naturalflow.model.StockPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockPriceRepository extends JpaRepository<StockPrice, Long> {

    /**
     * Find prices for a symbol within a time range
     */
    List<StockPrice> findBySymbolAndTimestampBetweenOrderByTimestampAsc(
        String symbol,
        Instant start,
        Instant end
    );

    /**
     * Get the most recent price for a symbol
     */
    Optional<StockPrice> findFirstBySymbolOrderByTimestampDesc(String symbol);

    /**
     * Find price closest to a specific timestamp (for OTM checking)
     */
    @Query("SELECT sp FROM StockPrice sp WHERE sp.symbol = :symbol " +
           "AND sp.timestamp <= :timestamp ORDER BY sp.timestamp DESC LIMIT 1")
    Optional<StockPrice> findClosestPriceBeforeTimestamp(
        @Param("symbol") String symbol,
        @Param("timestamp") Instant timestamp
    );

    /**
     * Check if we have price data for a symbol on a specific date
     */
    @Query("SELECT COUNT(sp) > 0 FROM StockPrice sp WHERE sp.symbol = :symbol " +
           "AND sp.timestamp >= :start AND sp.timestamp <= :end")
    boolean hasPriceDataForDate(
        @Param("symbol") String symbol,
        @Param("start") Instant start,
        @Param("end") Instant end
    );

    /**
     * Delete old price data (cleanup for storage management)
     */
    void deleteByTimestampBefore(Instant cutoff);
}
