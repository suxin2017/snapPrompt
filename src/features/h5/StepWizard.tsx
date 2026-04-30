import { useState, useRef, useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WizardStep {
  id: string
  label: string
  optional?: boolean
  canAdvance?: boolean // if false, next button is disabled
}

interface StepWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (index: number) => void
  children: ReactNode[]
  nextLabel?: string
  finalLabel?: string
  onFinish?: () => void
  allowDirectJump?: boolean
}

const SWIPE_THRESHOLD = 56
const SWIPE_VELOCITY = 0.45

export function StepWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  nextLabel = '下一步',
  finalLabel = '生成 Prompt',
  onFinish,
  allowDirectJump = false,
}: StepWizardProps) {
  void finalLabel
  const [direction, setDirection] = useState<1 | -1>(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const stepScrollerRef = useRef<HTMLDivElement>(null)
  const stepButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const dragStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const isLast = currentStep === steps.length - 1

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  useEffect(() => {
    const scroller = stepScrollerRef.current
    const activeButton = stepButtonRefs.current[currentStep]
    if (!scroller || !activeButton) return

    const scrollerRect = scroller.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    const outOfViewLeft = buttonRect.left < scrollerRect.left
    const outOfViewRight = buttonRect.right > scrollerRect.right

    if (outOfViewLeft || outOfViewRight) {
      activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentStep, steps.length])
  const canAdvance = steps[currentStep]?.canAdvance !== false

  function goTo(index: number) {
    if (index < 0 || index >= steps.length) return
    setDirection(index > currentStep ? 1 : -1)
    onStepChange(index)
  }

  function goNext() {
    if (isLast) {
      onFinish?.()
    } else {
      goTo(currentStep + 1)
    }
  }

  function goPrev() {
    goTo(currentStep - 1)
  }

  // Touch gesture handlers
  function onTouchStart(e: React.TouchEvent) {
    dragStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!dragStart.current) return
    const dx = e.changedTouches[0].clientX - dragStart.current.x
    const dy = e.changedTouches[0].clientY - dragStart.current.y
    const dt = Date.now() - dragStart.current.time
    const velocity = Math.abs(dx) / dt
    dragStart.current = null

    // Ignore mostly-vertical gestures to avoid accidental horizontal page switches.
    if (Math.abs(dy) > Math.abs(dx) * 0.8) {
      return
    }

    if (Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY) {
      if (dx < 0 && canAdvance) {
        goNext()
      } else if (dx > 0 && currentStep > 0) {
        goPrev()
      }
    }
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  }

  const transition = { duration: 0.18, ease: 'easeOut' as const }

  return (
    <div className="flex flex-col gap-0">
      {/* 面包屑 */}
      <div className="mb-4 flex items-center gap-1 pb-1">
        <div ref={stepScrollerRef} className="hide-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {steps.map((step, i) => {
            const isPast = i < currentStep
            const isActive = i === currentStep
            const isFuture = i > currentStep
            return (
              <div key={step.id} className="flex shrink-0 items-center gap-1">
                <button
                  ref={(el) => {
                    stepButtonRefs.current[i] = el
                  }}
                  type="button"
                  disabled={isFuture && !allowDirectJump}
                  onClick={() => goTo(i)}
                  className={[
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
                    isActive
                      ? 'bg-(--primary) text-(--primary-foreground)'
                      : isPast
                        ? 'bg-(--muted) text-(--primary) hover:bg-(--secondary)'
                        : 'cursor-default text-(--muted-foreground) opacity-40',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold',
                      isPast ? 'bg-(--primary) text-(--primary-foreground)' : 'bg-current/20',
                    ].join(' ')}
                  >
                    {isPast ? '✓' : i + 1}
                  </span>
                  {step.label}
                  {step.optional ? <span className="opacity-60">（可选）</span> : null}
                </button>
                {i < steps.length - 1 ? (
                  <ChevronRight size={12} className="shrink-0 text-(--muted-foreground)" />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* 快速跳转 */}
        <div ref={menuRef} className="relative ml-1 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="快速跳转分类"
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full transition',
              menuOpen
                ? 'bg-(--primary) text-(--primary-foreground)'
                : 'bg-(--muted) text-(--muted-foreground) hover:bg-(--secondary) hover:text-(--primary)',
            ].join(' ')}
          >
            <LayoutGrid size={13} />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-xl border border-(--border) bg-(--card) shadow-lg">
              <p className="border-b border-(--border) px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-(--muted-foreground)">
                快速跳转
              </p>
              <div className="max-h-64 overflow-y-auto py-1">
                {steps.map((step, i) => {
                  const isPast = i < currentStep
                  const isActive = i === currentStep
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => { goTo(i); setMenuOpen(false) }}
                      className={[
                        'flex w-full items-center gap-2 px-3 py-2 text-xs transition',
                        isActive ? 'bg-(--primary)/10 font-medium text-(--primary)' : 'text-(--foreground) hover:bg-(--muted)',
                      ].join(' ')}
                    >
                      <span className={[
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                        isActive || isPast ? 'bg-(--primary) text-(--primary-foreground)' : 'bg-(--muted) text-(--muted-foreground)',
                      ].join(' ')}>
                        {isPast ? '✓' : i + 1}
                      </span>
                      {step.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Step 内容区（手势） */}
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="will-change-transform"
          >
            {children[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部导航 */}
      <div className="mt-4 flex items-center gap-2 border-t border-(--border) pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentStep === 0}
          onClick={goPrev}
          className="gap-1"
        >
          <ChevronLeft size={14} />
          上一步
        </Button>
        <div className="flex-1 text-center text-xs text-(--muted-foreground)">
          {currentStep + 1} / {steps.length}
        </div>
        {!isLast ? (
          <Button
            size="sm"
            disabled={!canAdvance}
            onClick={goNext}
            className="gap-1"
          >
            {nextLabel}
            <ChevronRight size={14} />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
