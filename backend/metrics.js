/**
 * Calculate simulation metrics based on agent states
 */
export function calculateMetrics(agents) {
  if (!agents || agents.length === 0) {
    return { hype: 50, sentiment: 50, surge: 50 };
  }

  // Hype: based on average mood intensity
  const avgMoodIntensity = agents.reduce((sum, a) => sum + (a.current_mood_intensity || 5), 0) / agents.length;
  const hype = Math.min(100, Math.round(avgMoodIntensity * 10));

  // Sentiment: based on celebration vs disappointment ratio
  const celebratingCount = agents.filter(a => a.status_activity === 'Celebrating').length;
  const disappointedCount = agents.filter(a => a.status_activity === 'Disappointed').length;
  const celebrationRate = (celebratingCount - disappointedCount) / agents.length;
  const sentiment = Math.max(0, Math.min(100, Math.round((celebrationRate + 1) * 50)));

  // Surge: momentum of emotional intensity
  const activeCount = agents.filter(a => a.status_activity !== 'idle').length;
  const activeRate = activeCount / agents.length;
  const surge = Math.round(activeRate * 100);

  return {
    hype: Math.round(hype),
    sentiment: Math.round(sentiment),
    surge: Math.round(surge),
    active_agents: activeCount,
    total_agents: agents.length
  };
}
