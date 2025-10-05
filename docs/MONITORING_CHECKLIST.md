# Optimization Monitoring Checklist

Use this checklist to monitor the health and performance of QuickBuck's database optimizations.

## 📊 Daily Monitoring

### Convex Dashboard Checks

- [ ] **Total Daily Bandwidth**

  - Expected: 100-120 MB/day
  - 🟢 Healthy: < 150 MB/day
  - 🟡 Warning: 150-200 MB/day
  - 🔴 Critical: > 200 MB/day

- [ ] **Top Functions by Bandwidth**

  - `getUserCompanies`: Should be < 15 MB/day
  - `getUserAccounts`: Should be < 10 MB/day
  - `getCompanyDashboard`: Should be < 5 MB/day
  - `getLeaderboard`: Should be < 8 MB/day
  - `getAllPublicStocks`: Should be < 5 MB/day

- [ ] **Query Performance**

  - Average query time: 30-100ms
  - 95th percentile: < 200ms
  - No queries timing out

- [ ] **Error Rates**
  - Query timeouts: 0
  - Failed mutations: < 0.1%
  - Validation errors: Check for patterns

## 📈 Weekly Review

### Performance Trends

- [ ] Review bandwidth trends (last 7 days)
- [ ] Identify any sudden spikes
- [ ] Check for new slow queries
- [ ] Verify cron jobs running correctly
  - `automaticPurchase` every 10 min
  - `updateStockPrices` every 5 min
  - `cleanupOldPriceHistory` daily at 3 AM

### Data Growth

- [ ] Check table sizes

  - `ledger`: Should grow steadily
  - `stockPriceHistory`: Should cap at ~90 days
  - `products`: Growth with new products
  - `stocks`: Growth with trading activity

- [ ] Verify cleanup cron is working
  - `stockPriceHistory` not growing unbounded
  - Old data being removed properly

### Code Quality

- [ ] Review new queries added this week
- [ ] Check for `.collect()` without limits
- [ ] Verify all new queries use proper indexes
- [ ] Ensure batch operations used

## 🔍 Monthly Audit

### Comprehensive Review

- [ ] **Bandwidth Analysis**

  - Compare to previous month
  - Identify trend direction
  - Calculate cost impact
  - Review top consumers

- [ ] **Query Optimization**

  - Find slowest queries (top 10)
  - Identify optimization opportunities
  - Check for new N+1 patterns
  - Review index usage

- [ ] **Data Health**

  - Verify data integrity
  - Check for orphaned records
  - Review deletion policies
  - Ensure cleanup jobs working

- [ ] **Scalability Assessment**
  - Project growth rate
  - Estimate future bandwidth needs
  - Plan for scaling if needed
  - Review resource allocation

### Performance Testing

- [ ] Load test with simulated traffic
- [ ] Test with 2x expected users
- [ ] Verify no degradation
- [ ] Check cache hit rates

## 🚨 Alert Thresholds

### Set Up Alerts For:

1. **Daily bandwidth > 150 MB**

   - Action: Review top functions
   - Check for anomalies

2. **Query time > 500ms (sustained)**

   - Action: Optimize specific query
   - Add indexes if needed

3. **Error rate > 1%**

   - Action: Investigate cause
   - Check logs for patterns

4. **Cron job failures**

   - Action: Fix immediately
   - Could cause data buildup

5. **Table growth rate anomaly**
   - Action: Check cleanup jobs
   - Verify deletion policies

## ✅ Health Indicators

### Green Status (Healthy) 🟢

- Daily bandwidth: 100-120 MB
- Query time: 30-100ms avg
- Error rate: < 0.1%
- All cron jobs running
- Tables growing as expected

### Yellow Status (Attention) 🟡

- Daily bandwidth: 150-200 MB
- Query time: 100-200ms avg
- Error rate: 0.1-1%
- Occasional cron failures
- Some slow queries appearing

### Red Status (Critical) 🔴

- Daily bandwidth: > 200 MB
- Query time: > 200ms avg
- Error rate: > 1%
- Cron jobs failing
- Queries timing out

## 🔧 Quick Fixes

### If Bandwidth Spikes

1. Check Convex dashboard for top function
2. Review recent code changes
3. Look for new `.collect()` calls
4. Verify limits on queries
5. Check for missing indexes

### If Queries Slow Down

1. Identify slow query in dashboard
2. Check if using proper index
3. Verify result set is limited
4. Look for N+1 patterns
5. Consider adding denormalized field

### If Cron Jobs Fail

1. Check Convex logs
2. Verify table access
3. Look for timeout errors
4. Check data consistency
5. Review job logic

## 📝 Reporting Template

### Monthly Performance Report

```
Date: [Month Year]
Status: [Green/Yellow/Red]

Bandwidth:
- Daily Average: ___ MB
- Peak Day: ___ MB on [date]
- Trend: [Increasing/Stable/Decreasing]

Query Performance:
- Average: ___ ms
- 95th Percentile: ___ ms
- Slowest Query: [function name] at ___ ms

Issues:
- [List any issues encountered]
- [Actions taken]

Recommendations:
- [Any optimization suggestions]
- [Scaling considerations]
```

## 🎯 Key Metrics to Track

| Metric          | Target     | Current   | Trend    |
| --------------- | ---------- | --------- | -------- |
| Daily Bandwidth | 100-120 MB | \_\_\_ MB | ⬆️/➡️/⬇️ |
| Avg Query Time  | 30-100ms   | \_\_\_ ms | ⬆️/➡️/⬇️ |
| Queries/Page    | 5-10       | \_\_\_    | ⬆️/➡️/⬇️ |
| Error Rate      | < 0.1%     | \_\_\_%   | ⬆️/➡️/⬇️ |
| Cron Success    | 100%       | \_\_\_%   | ⬆️/➡️/⬇️ |

## 📚 Reference Documentation

When investigating issues, refer to:

- [Phase 1 Optimizations](./DATABASE_BANDWIDTH_OPTIMIZATION.md)
- [Phase 2 Optimizations](./BANDWIDTH_OPTIMIZATION_PHASE2.md)
- [Phase 3 Optimizations](./BANDWIDTH_OPTIMIZATION_PHASE3.md)
- [Quick Reference Guide](./OPTIMIZATION_QUICK_REFERENCE.md)
- [Complete Summary](./DATABASE_OPTIMIZATION_COMPLETE.md)
- [Executive Summary](./EXECUTIVE_SUMMARY.md)

## 🔄 Review Schedule

- **Daily:** Check bandwidth and top functions (5 min)
- **Weekly:** Review trends and new code (15 min)
- **Monthly:** Full audit and report (1 hour)
- **Quarterly:** Strategic review and planning (2 hours)

---

**Last Updated:** October 5, 2025  
**Next Review:** October 12, 2025  
**Status:** 🟢 All systems healthy
