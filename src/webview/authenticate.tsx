import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import styles from './index.module.css';
import { useAuthentication, useSubscriptions } from './hooks';
import { getDateFromUnixTimestamp } from './utils';
import { useState } from 'react';
import { SUBSCRIPTION_UNLIMITED_TOKENS } from '../common/constants';

export const Authentication = () => {
  const { 
    completed, 
    user, 
    authenticate, 
    logout, 
    stripeProducts,
    updatingEmail,
    updateEmail
  } = useAuthentication();

  const { 
    validSubscription,
    subscriptionInProgress,
    subscribe,
    cancelSubscription,
    applyCoupon,
    discount,
    applyingCoupon,
    couponError,
    couponApplied,
    coupon,
    setCoupon,
    handleRemoveCoupon
  } = useSubscriptions();

  const [email, setEmail] = useState(user?.email || '');

  const adjustedPrice = (price: number) => {
    return discount > 0 ? (price * (1 - discount / 100)).toFixed(2) : price.toFixed(2);
  };

  const handleCoupon = async () => {
    await applyCoupon(coupon)
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) return;
    await updateEmail(email);
  };

  if (!completed) {
    return <div>Loading...</div>;
  }

  // Check if the user has a free subscription
  const isFreeSubscription = user?.subscriptionId === 'free'
  const isMonthlySubscription = user?.subscriptionInterval === 'month'
  const isNotUnlimited = user?.subscriptionTokens !==  SUBSCRIPTION_UNLIMITED_TOKENS

  // Determine which subscriptions to show
  const availableSubscriptions = Array.isArray(stripeProducts)
    ? stripeProducts.filter(product => {
        if (!validSubscription) return true; // Show all plans if user has no active subscription
        if (isFreeSubscription) return product.id !== 'free'; // Exclude 'free' if already on free plan
        if (isMonthlySubscription) {
          return (
            product.interval === 'year' || 
            (isNotUnlimited && product.interval === 'month' && Number(product.tokens) === SUBSCRIPTION_UNLIMITED_TOKENS)
          ); // Show yearly, monthly unlimited, or unlimited plans for monthly subscribers
        }
        if (isNotUnlimited) return Number(product.tokens) === SUBSCRIPTION_UNLIMITED_TOKENS && product.interval === 'year'; // Show only unlimited plans for non unlimited plans
        return false; // Otherwise, hide subscription options
      })
    : [];

  // Determine the token count color
  const getTokenCountColor = (tokenCount: number) => {
    if (tokenCount > 30 || tokenCount == SUBSCRIPTION_UNLIMITED_TOKENS) return styles.tokenCountGreen;
    if (tokenCount <= 30 && tokenCount > 10) return styles.tokenCountOrange;
    return styles.tokenCountRed;
  };

  const getProductHeadingStyle = (interval: string) => {
    if (interval === 'month') 
      return styles.monthlyHeading
    else if (interval === 'year') 
      return styles.yearlyHeading
    else 
      return styles.freeHeading
  }

  return (
    <div>
      {user ? (
        <div className={styles.userContainer}>
          {/* User Details */}
          <div className={styles.userBox}>
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={`${user.fullName}'s avatar`}
                className={styles.avatar}
              />
            )}
            <div>ID: {user.id}</div>
            <div>Name: {user.fullName}</div>
            <div>Email: {user.email}</div>
            <div className={getTokenCountColor(Number(user.tokenCount))}>
              Remaining Actions: {user.tokenCount == SUBSCRIPTION_UNLIMITED_TOKENS ? 'unlimited' : user.tokenCount}
            </div>
            <VSCodeButton className={styles.authenticateButton} onClick={logout}>
              Logout
            </VSCodeButton>
          </div>

          {/* Force Email Input if Missing */}
          {!user.email && (
            <div className={styles.emailFormContainer}>
              <h3>Please enter your email to continue</h3>
              <VSCodeTextField 
                value={email} 
                onInput={(e) => {
                  const target = e.target as HTMLInputElement | null;
                  if (target) {
                    setEmail(target.value);
                  }
                }}
                placeholder="Enter your email"
                className={styles.emailInput}
              />
              <VSCodeButton 
                onClick={handleUpdateEmail} 
                disabled={updatingEmail} 
                className={styles.emailSubmitButton}
              >
                {updatingEmail ? 'Updating...' : 'Update Email'}
              </VSCodeButton>
            </div>
          )}

          {user.email && (
            <div className={styles.subscriptionBox}>
              {validSubscription && (
                <>
                  <h3>Subscription Details</h3>
                  <p><strong>Type:</strong> {user.subscriptionName}</p>
                  <p><strong>Interval:</strong> {user.subscriptionInterval}</p>
                  <p>
                    <strong>Expiry Date:</strong>{' '}
                    {user.subscriptionCurrentPeriodEnd && user.subscriptionCurrentPeriodEnd.length > 0
                      ? getDateFromUnixTimestamp(user.subscriptionCurrentPeriodEnd).toLocaleString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short'
                        })
                      : 'N/A'}
                  </p>                
                  <p><strong>Actions:</strong> {(user.subscriptionTokens ?? 0) >= SUBSCRIPTION_UNLIMITED_TOKENS ? 'Unlimited' : user.subscriptionTokens}</p>
                  
                  {/* Show Cancel Subscription button only for paid plans */}
                  {!isFreeSubscription && (
                    <VSCodeButton className={styles.cancelSubscriptionButton} onClick={() => cancelSubscription(user.subscriptionId || '') }>
                      Cancel Subscription
                    </VSCodeButton>
                  )}
                </>
              )}

              {availableSubscriptions.length > 0  && (
                <div className={styles.emailFormContainer}>
                {couponApplied ? (
                  <div className={styles.appliedCoupon}>
                    <h3>Coupon Applied</h3>
                    <p><strong>Coupon:</strong> {coupon}</p>
                    <p><strong>Discount:</strong> {discount}%</p>
                    <VSCodeButton onClick={handleRemoveCoupon} className={styles.emailSubmitButton}>
                      Remove Coupon
                    </VSCodeButton>
                  </div>
                ) : (
                  <>
                    <h3>Have a Coupon?</h3>
                    <VSCodeTextField 
                      value={coupon} 
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement | null;
                        if (target) {
                          setCoupon(target.value);
                        }
                      }}
                      placeholder="Enter coupon code"
                      className={styles.emailInput}
                    />
                    <VSCodeButton 
                      onClick={handleCoupon} 
                      disabled={applyingCoupon} 
                      className={styles.emailSubmitButton}
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply'}
                    </VSCodeButton>
                    {couponError && <p className={styles.errorText}>{couponError}</p>}
                    </>
                )}
                </div>
              )}

              {availableSubscriptions.length > 0 && (
                <>
                  <h3>{validSubscription ? 'Upgrade Your Plan' : 'Choose a Subscription'}</h3>
                  <p>*** An action is either a generated chat message or an accepted code completion suggestion</p>
                  {subscriptionInProgress.length > 0 ? (
                    <p>{subscriptionInProgress}</p>
                  ) : (
                    <div className={styles.subscriptionOptions}>
                      {availableSubscriptions.map(product => (
                        <div key={product.id} className={styles.subscriptionCard}>
                          <h4 className={getProductHeadingStyle(product.interval)}>
                            {product.name}{product.interval === 'month' ? ' Monthly' : ''}
                          </h4>                          
                          <ul>
                            {Array.isArray(product.features) && product.features.map((feature, i) => (
                              <li key={i}>{feature.name}</li>
                            ))}
                          </ul>
                          <p>
                            <strong>Interval: </strong> 
                            {product.interval}
                          </p>
                          <p>
                            <strong>Price: </strong> 
                            {Number(product.price) === 0 
                              ? 'Free' 
                              : `${product.currency.toUpperCase()} $${adjustedPrice(Number(product.price) / 100)}`}
                          </p>
                          <VSCodeButton className={styles.subscriptionButton} 
                              onClick={() => subscribe(product.priceId, coupon)}
                              disabled={subscriptionInProgress.length > 0 || (user.subscriptionUsedFree == true && Number(product.price) === 0) }
                            >
                            {validSubscription ? 'Upgrade' : 'Subscribe Now'}
                          </VSCodeButton>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontWeight: 'normal', color: 'red' }}>
            Note: Your dAppForge account is linked to the authentication provider you choose. If you sign up with both, you will have two different accounts.
          </p>
          <p style={{ fontWeight: 'normal', color: 'red' }}>
            Remember to go to the "dappforge language” section in settings and select the option you will be coding in (Substrate, ink!, Solidity, Rust, etc.) to make sure the LLM produces accurate results.
          </p>
          <VSCodeButton className={styles.authenticateButton} onClick={() => authenticate('github')}>
            Login with GitHub
          </VSCodeButton>
          <br />
          <br />
          <VSCodeButton className={styles.authenticateButton} onClick={() => authenticate('google')}>
            Login with Google
          </VSCodeButton>
        </div>
      )}
    </div>
  );
};
