// \src\webview\api-dashboard.tsx
import React, { useMemo } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import styles from './index.module.css'
import { useApi } from './hooks'
import { PRODUCT_TYPE_AI_API } from '../common/constants'

export const ApiDashboard: React.FC = () => {
  // If you already have a hook for API keys/usage, replace these with real calls
  const {
    completed,
    user,
    stripeProducts,
    loading,
    topUpInProgress,
    generateApiKey,
    resetRawApiKey,
    buyTopUp
  } = useApi()

  const hasApiKey = !!(
    user?.apiKeyHash && String(user.apiKeyHash).trim().length > 0
  )
  const hasRawApiKey = !!(
    user?.apiRawKey && String(user.apiRawKey).trim().length > 0
  )

  const onCopy = async () => {
    if (!hasRawApiKey) return
    try {
      await navigator.clipboard.writeText(user?.apiRawKey || '')
    } catch {
      // ignore
    }
  }

  // Token color helper
  const getTokenCountColor = (n: number | undefined | null) => {
    const tokenCount = Number(n ?? 0)
    if (tokenCount > 10000) return styles.tokenCountGreen
    if (tokenCount > 1000) return styles.tokenCountOrange
    return styles.tokenCountRed
  }

  // Format helpers
  // TypeScript / TSX
  const fmt = {
    int: (v: unknown) => Number(v ?? 0).toLocaleString(),
    date: (v: unknown) => {
      if (v == null || v === '') return '-'

      // If it's already a Date, use it
      if (v instanceof Date) {
        return isNaN(v.getTime()) ? '-' : v.toLocaleString()
      }

      // If it's a string, try ISO first; if parse fails, fall back to numeric
      if (typeof v === 'string') {
        const iso = new Date(v)
        if (!isNaN(iso.getTime())) {
          return iso.toLocaleString()
        }
        // fallback: numeric string (epoch)
        const n = Number(v)
        if (!Number.isFinite(n)) return '-'
        const ms = n < 1e12 ? n * 1000 : n // seconds vs ms
        const d = new Date(ms)
        return isNaN(d.getTime()) ? '-' : d.toLocaleString()
      }

      // If it's a number (epoch)
      if (typeof v === 'number') {
        const ms = v < 1e12 ? v * 1000 : v
        const d = new Date(ms)
        return isNaN(d.getTime()) ? '-' : d.toLocaleString()
      }

      return '-'
    }
  }

  // Determine which products to show
  const apiTopUpProducts = useMemo(
    () =>
      Array.isArray(stripeProducts)
        ? stripeProducts.filter((product) => {
            if (product.id === 'freeApi') return false
            return product.productType === PRODUCT_TYPE_AI_API && product.active
          })
        : [],
    [stripeProducts]
  )

  const adjustedPrice = (price: number) => price.toFixed(2)

  if (!completed) return <div>Loading...</div>

  return (
    <div className={styles.userContainer}>
      <h2>API Dashboard</h2>

      {/* API Key */}
      <div className={styles.subscriptionBox}>
        <h3>API Key</h3>

        {!hasApiKey && !hasRawApiKey && (
          <>
            <p>You don&apos;t have an API key yet.</p>
            <VSCodeButton onClick={generateApiKey} disabled={loading}>
              {loading ? 'Generating…' : 'Generate API Key'}
            </VSCodeButton>
          </>
        )}

        {hasRawApiKey && (
          <div className={styles.emailFormContainer}>
            <p style={{ color: 'red' }}>
              This key will be shown only once. Copy and store it securely.
            </p>
            <pre
              className={styles.subscriptionCard}
              style={{ padding: 12, overflowX: 'auto' }}
            >
              {user?.apiRawKey}
            </pre>
            <div style={{ display: 'flex', gap: 8 }}>
              <VSCodeButton onClick={onCopy}>Copy</VSCodeButton>
              <VSCodeButton appearance="secondary" onClick={resetRawApiKey}>
                I have saved it
              </VSCodeButton>
            </div>
          </div>
        )}

        {hasApiKey && !hasRawApiKey && (
          <>
            <p>Existing key:&nbsp;</p>
            <pre
              className={styles.subscriptionCard}
              style={{ padding: 12, overflowX: 'auto' }}
            >
              {user?.apiMaskedKey}
            </pre>
            <VSCodeButton onClick={generateApiKey} disabled={loading}>
              {loading ? 'Generating…' : 'Generate New Key'}
            </VSCodeButton>
            <p
              style={{
                marginTop: 8,
                color: 'var(--vscode-descriptionForeground)'
              }}
            >
              Generating a new key will revoke the previous one.
            </p>
          </>
        )}
      </div>

      {/* API Usage (only when a key exists and we are not showing the freshly generated raw key) */}
      {hasApiKey && !hasRawApiKey && (
        <div className={styles.subscriptionBox}>
          <h3>API Usage</h3>
          <div
            className={styles.subscriptionOptions}
            style={{ display: 'grid', gap: 8 }}
          >
            <div className={styles.subscriptionCard}>
              <strong>Free monthly cap</strong>
              <div>{fmt.int(user?.apiFreeTokenCap)}</div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Free token balance</strong>
              <div
                className={getTokenCountColor(
                  Number(user?.apiFreeTokenBalance)
                )}
              >
                {fmt.int(user?.apiFreeTokenBalance)}
              </div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Paid token balance</strong>
              <div
                className={getTokenCountColor(
                  Number(user?.apiPaidTokenBalance)
                )}
              >
                {fmt.int(user?.apiPaidTokenBalance)}
              </div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Token balance</strong>
              <div
                className={getTokenCountColor(
                  Number(user?.apiPaidTokenBalance) +
                    Number(user?.apiFreeTokenBalance)
                )}
              >
                {fmt.int(
                  Number(user?.apiPaidTokenBalance) +
                    Number(user?.apiFreeTokenBalance)
                )}
              </div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Used input tokens (month)</strong>
              <div>{fmt.int(user?.apiUsedInputTokensMonth)}</div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Used output tokens (month)</strong>
              <div>{fmt.int(user?.apiUsedOutputTokensMonth)}</div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Free tier resets</strong>
              <div>{fmt.date(user?.apiFreeResetDate)}</div>
            </div>
            <div className={styles.subscriptionCard}>
              <strong>Last used</strong>
              <div>{fmt.date(user?.apiLastUsed)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top-ups */}
      {hasApiKey && !hasRawApiKey && apiTopUpProducts.length > 0 && (
        <div className={styles.subscriptionBox}>
          <h3>Top up tokens</h3>
          <p>One-time purchases to increase your available tokens.</p>
          {topUpInProgress.length > 0 ? (
            <p>{topUpInProgress}</p>
          ) : (
            <div className={styles.subscriptionOptions}>
              {apiTopUpProducts.map((product) => (
                <div key={product.id} className={styles.subscriptionCard}>
                  <h4 className={styles.monthlyHeading}>{product.name}</h4>
                  <ul>
                    {Array.isArray(product.features) &&
                      product.features.map((feature, i) => (
                        <li key={i}>{feature.name}</li>
                      ))}
                  </ul>
                  <p>
                    <strong>Price: </strong>
                    {Number(product.price) === 0
                      ? 'Free'
                      : `${product.currency.toUpperCase()} $${adjustedPrice(
                          Number(product.price) / 100
                        )}`}
                  </p>
                  <VSCodeButton
                    className={styles.subscriptionButton}
                    onClick={() => buyTopUp(product.priceId)}
                    disabled={
                      topUpInProgress.length > 0 || Number(product.price) === 0
                    }
                  >
                    Buy
                  </VSCodeButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
