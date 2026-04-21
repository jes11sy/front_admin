/**
 * Общие классы в стиле главного дашборда (/) — фон #111113 / #f5f5f7, карточки rounded-[20px], акцент #0a4f42.
 */
export function dashboardStyles(isDark: boolean) {
  return {
    pageRoot: `min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`,
    content: 'px-4 py-6',
    title: `text-xl font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`,
    subtitle: `mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`,

    statCard: `rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`,
    statLabel: `text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`,
    statValue: `text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`,

    panel: `rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`,
    panelPadded: `rounded-[20px] p-5 md:p-6 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`,
    innerWell: `rounded-2xl p-4 border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-[#f9fafb] border-black/[0.06]'}`,

    input:
      `w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] outline-none ring-0 focus:ring-0 focus-visible:ring-0 transition-all shadow-sm ` +
      (isDark
        ? 'bg-white/[0.04] text-white placeholder-white/30 border border-white/15 focus:border-white/30'
        : 'border border-[#cfd2d8] bg-white text-[#111113] placeholder:text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.06)] focus:border-gray-300'),

    select:
      `w-full min-h-[44px] px-4 py-2 rounded-2xl text-sm outline-none ring-0 focus:ring-0 transition-all ` +
      (isDark
        ? 'bg-white/[0.04] text-white border border-white/15 focus:border-white/30'
        : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'),

    primaryBtn:
      `inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-2xl text-sm font-semibold transition ` +
      (isDark
        ? 'bg-white text-[#111113] hover:bg-gray-200'
        : 'bg-[#0a4f42] text-white hover:bg-[#083f35] shadow-md shadow-[#0a4f42]/20'),

    secondaryBtn:
      `inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-2xl text-sm font-medium transition ` +
      (isDark
        ? 'bg-white/[0.04] text-white hover:bg-white/[0.08]'
        : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-[#f3f4f6]'),

    ghostBtn:
      `inline-flex items-center justify-center min-h-[40px] px-4 rounded-2xl text-sm font-medium transition ` +
      (isDark
        ? 'text-white/90 hover:bg-white/[0.06]'
        : 'text-[#3a3a3c] hover:bg-black/[0.04]'),

    iconFilterBtn:
      `relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ` +
      (isDark ? 'text-white/92 hover:bg-white/[0.04]' : 'text-[#3a3a3c] hover:bg-black/[0.035]'),

    destructiveBtn:
      `inline-flex items-center justify-center min-h-[40px] px-4 rounded-2xl text-sm font-medium transition ` +
      (isDark
        ? 'bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-950/60'
        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'),

    sectionLabel: `text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`,

    tableWrap: `overflow-hidden rounded-[20px] border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.08] bg-white'}`,
    tableScroll: 'overflow-x-auto',
    theadRow: `border-b ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-50/90 border-gray-200'}`,
    th: `text-left py-3 px-4 text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`,
    tr: `border-b transition-colors ${isDark ? 'border-white/10 hover:bg-white/[0.04]' : 'border-gray-100 hover:bg-black/[0.02]'}`,
    td: `py-3 px-4 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`,

    emptyState: `text-center py-16 rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`,
    emptyTitle: `text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`,
    emptyHint: `text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`,

    spinner: `inline-block animate-spin rounded-full h-8 w-8 border-2 ${isDark ? 'border-white/20 border-t-white' : 'border-gray-200 border-t-[#0a4f42]'}`,

    drawerBackdrop: isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm',
    drawerPanel:
      `fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] border-l md:border ` +
      (isDark
        ? 'bg-[#111113]/92 backdrop-blur-xl border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
        : 'bg-white border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'),
    drawerHeader: `hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
      isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
    }`,
    drawerMobileClose: `md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
      isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
    }`,
    drawerFooter: `sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
      isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
    }`,
    filterOptionActive: isDark ? 'bg-white text-[#111113]' : 'bg-[#0a4f42] text-white',
    filterOptionIdle: isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-white hover:bg-black/[0.035] text-[#111113]',

    tabsPillTrack: `inline-flex w-full max-w-full items-center gap-0.5 rounded-[22px] border p-1 ${
      isDark ? 'border-white/10 bg-[#111113]/90' : 'border-black/[0.08] bg-white'
    }`,
    tabPill:
      `min-h-[34px] flex-1 rounded-[16px] px-2 py-1 text-[13px] font-semibold leading-tight transition-colors duration-200 `,
    tabPillActive: isDark ? 'text-white bg-white/[0.10]' : 'text-white bg-[#0a4f42] shadow-[0_8px_20px_rgba(10,79,66,0.22)]',
    tabPillIdle: isDark ? 'text-white/80 hover:bg-white/[0.06]' : 'text-[#3a3a3c] hover:bg-black/[0.04]',

    linkAccent: isDark ? 'text-teal-400 hover:text-teal-300' : 'text-[#0a4f42] hover:underline',
  }
}
