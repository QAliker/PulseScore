export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Pulse<span className="text-red-500">Score</span> Arena
            </h1>
          </div>
          <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
            LIVE
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-red-400 text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Scores en temps réel
        </div>

        <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tighter mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          PulseScore Arena
        </h2>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          La plateforme de suivi sportif en direct. Scores en temps réel,
          classements live et prédictions pour les vrais fans.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors duration-200">
            Voir les matchs en direct
          </button>
          <button className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg border border-gray-700 transition-colors duration-200">
            En savoir plus
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Temps réel',
              description:
                'Scores mis à jour instantanément via WebSocket + Redis Pub/Sub.',
            },
            {
              icon: '🏆',
              title: 'Classements live',
              description:
                'Leaderboards propulsés par Redis Sorted Sets — O(log N) garanti.',
            },
            {
              icon: '🎯',
              title: 'Prédictions',
              description:
                'Mini-jeux de prédiction pour engager les fans pendant les matchs.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-colors duration-200"
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {card.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 text-center py-8 text-gray-500 text-sm">
        PulseScore Arena — Infrastructure Feature 1 ✅
      </footer>
    </main>
  );
}
