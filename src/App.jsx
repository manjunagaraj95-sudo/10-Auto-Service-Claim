
import React, { useState, useEffect, useCallback } from 'react';

// --- Icon Components (Simple Placeholder) ---
const Icon = ({ name, className = '' }) => {
    // In a real app, this would use a proper icon library (e.g., FontAwesome, Material Icons)
    const icons = {
        dashboard: '📊',
        claim: '📋',
        user: '👤',
        progress: '⏳',
        fraud: '🕵️‍♀️',
        amount: '💰',
        approval: '✅',
        reject: '❌',
        edit: '✏️',
        save: '💾',
        submit: '🚀',
        update: '🔄',
        back: '⬅️',
        add: '➕',
        search: '🔍',
        filter: '⚙️',
        sort: '⬆️⬇️',
        calendar: '📅',
        history: '📜',
        info: 'ℹ️',
        warning: '⚠️',
        error: '🚨',
        success: '👍',
        moon: '🌙',
        sun: '☀️',
        chevronRight: '❯',
        check: '✔️',
        file: '📄',
        vehicle: '🚗',
        customer: '🧑',
        clock: '🕒',
        money: '💵',
        activity: '⚡',
        task: '📝',
        chart: '📈',
        up: '▲',
        down: '▼',
        plus: '➕',
        expand: '➕',
        collapse: '➖',
    };
    return <span className={`icon icon-${name} ${className}`}>{icons[name] || name}</span>;
};

// --- RBAC & Data Definitions ---
const USER_ROLES = {
    CSR: 'customer service representative',
    ANALYST: 'Claim analyst',
    APPROVER: 'claim approver',
    FINANCE: 'finance manager',
};

const userPermissions = {
    [USER_ROLES.CSR]: {
        canViewDashboard: true,
        canInitiateClaim: true,
        canViewClaimDetails: true,
        canReviewClaim: false,
        canApproveRejectClaim: false,
        canCalculateClaimAmount: false,
        dashboardKpis: ['claimRequests', 'claimClosures'],
        dashboardCharts: ['claimStatus', 'claimsPerMonth'],
        recentActivities: ['claim initiation'],
    },
    [USER_ROLES.ANALYST]: {
        canViewDashboard: true,
        canInitiateClaim: false,
        canViewClaimDetails: true,
        canReviewClaim: true,
        canApproveRejectClaim: false,
        canCalculateClaimAmount: false,
        dashboardKpis: ['inProgressClaims', 'fraudClaims'],
        dashboardCharts: ['claimStatus'], // Re-using for general claim overview
        recentActivities: ['Review claim'],
        allowedStatusesForReview: ['Created', 'Accepted', 'Ironing'],
    },
    [USER_ROLES.APPROVER]: {
        canViewDashboard: true,
        canInitiateClaim: false,
        canViewClaimDetails: true,
        canReviewClaim: false,
        canApproveRejectClaim: true,
        canCalculateClaimAmount: false,
        dashboardKpis: ['inProgressClaims', 'openClaims', 'closedClaims'],
        dashboardCharts: ['claimStatus'],
        recentActivities: ['approve claim'],
        allowedStatusesForApproval: ['PendingApproval'],
    },
    [USER_ROLES.FINANCE]: {
        canViewDashboard: true,
        canInitiateClaim: false,
        canViewClaimDetails: true,
        canReviewClaim: false,
        canApproveRejectClaim: false,
        canCalculateClaimAmount: true,
        dashboardKpis: ['claimAmountByMonth'],
        dashboardCharts: ['claimByAmount'],
        recentActivities: ['Calculate Claim amount'],
        allowedStatusesForPayment: ['Ready', 'PaymentProcessed'],
    },
};

const CLAIM_STATUSES = {
    CREATED: { label: 'Created', color: 'var(--accent-grey)', tint: 'rgba(158, 158, 158, 0.1)' },
    ACCEPTED: { label: 'Accepted', color: 'var(--secondary-color)', tint: 'rgba(33, 150, 243, 0.1)' },
    IRONING: { label: 'Ironing', color: 'var(--accent-orange)', tint: 'rgba(255, 152, 0, 0.1)' },
    PENDING_APPROVAL: { label: 'Pending Approval', color: 'var(--accent-orange)', tint: 'rgba(255, 152, 0, 0.1)' },
    READY: { label: 'Ready', color: 'var(--primary-color)', tint: 'rgba(76, 175, 80, 0.1)' },
    DELIVERED: { label: 'Delivered', color: 'var(--primary-color)', tint: 'rgba(76, 175, 80, 0.1)' },
    CUSTOMER_PICKED: { label: 'Customer Picked', color: 'var(--primary-color)', tint: 'rgba(76, 175, 80, 0.1)' },
    REJECTED: { label: 'Rejected', color: 'var(--accent-red)', tint: 'rgba(244, 67, 54, 0.1)' },
    FRAUD: { label: 'Fraud Detected', color: 'var(--accent-red)', tint: 'rgba(244, 67, 54, 0.1)' },
    ESCALATED: { label: 'Escalated', color: 'var(--accent-purple)', tint: 'rgba(156, 39, 176, 0.1)' },
    PROCESSING_PAYMENT: { label: 'Processing Payment', color: 'var(--secondary-color)', tint: 'rgba(33, 150, 243, 0.1)' },
    PAYMENT_PROCESSED: { label: 'Payment Processed', color: 'var(--primary-color)', tint: 'rgba(76, 175, 80, 0.1)' },
};

const WORKFLOW_MILESTONES = [
    { name: 'Claim Created', status: 'Created', roles: [USER_ROLES.CSR] },
    { name: 'Claim Accepted', status: 'Accepted', roles: [USER_ROLES.ANALYST] },
    { name: 'Initial Review', status: 'Ironing', roles: [USER_ROLES.ANALYST] },
    { name: 'Pending Approval', status: 'PendingApproval', roles: [USER_ROLES.APPROVER] },
    { name: 'Approved', status: 'Ready', roles: [USER_ROLES.APPROVER] },
    { name: 'Processing Payment', status: 'ProcessingPayment', roles: [USER_ROLES.FINANCE] },
    { name: 'Payment Processed', status: 'PaymentProcessed', roles: [USER_ROLES.FINANCE] },
    { name: 'Claim Closed', status: 'Delivered', roles: [USER_ROLES.CSR, USER_ROLES.ANALYST, USER_ROLES.APPROVER, USER_ROLES.FINANCE] },
];


// --- Dummy Data Generator ---
const generateDummyClaims = (count) => {
    const claims = [];
    const customerNames = ['Alice Smith', 'Bob Johnson', 'Charlie Brown', 'Diana Prince', 'Eve Adams'];
    const vehicleModels = ['Toyota Camry', 'Honda Civic', 'Ford F-150', 'Tesla Model 3', 'BMW X5'];
    const issues = ['Engine malfunction', 'Accident damage', 'Routine service', 'Tire replacement', 'Brake repair'];
    const statuses = Object.keys(CLAIM_STATUSES);

    for (let i = 1; i <= count; i++) {
        const id = `CLAIM-${1000 + i}`;
        const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const vehicle = vehicleModels[Math.floor(Math.random() * vehicleModels.length)];
        const issue = issues[Math.floor(Math.random() * issues.length)];
        const amount = (Math.random() * 5000 + 500).toFixed(2); // $500 - $5500
        const randomStatusIndex = Math.floor(Math.random() * statuses.length);
        const statusKey = statuses[randomStatusIndex];
        const status = CLAIM_STATUSES[statusKey].label;

        const workflowHistory = [];
        let currentStatusIndex = 0;
        for (let j = 0; j < WORKFLOW_MILESTONES.length; j++) {
            const milestone = WORKFLOW_MILESTONES[j];
            const milestoneStatus = CLAIM_STATUSES[Object.keys(CLAIM_STATUSES).find(key => CLAIM_STATUSES[key].label === milestone.status)];
            if (statuses.indexOf(statusKey) >= Object.keys(CLAIM_STATUSES).indexOf(Object.keys(CLAIM_STATUSES).find(key => CLAIM_STATUSES[key].label === milestone.status))) {
                workflowHistory.push({
                    stage: milestone.name,
                    status: 'completed', // For past stages
                    date: new Date(Date.now() - (WORKFLOW_MILESTONES.length - j - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    by: `User ${milestone.roles[0]}`,
                    notes: `Stage ${milestone.name} completed.`,
                    slaBreach: Math.random() < 0.1 && j > 0, // 10% chance of SLA breach on non-first stages
                });
            } else {
                workflowHistory.push({
                    stage: milestone.name,
                    status: 'pending',
                    date: null,
                    by: null,
                    notes: '',
                    slaBreach: false,
                });
            }
            if (milestone.status === status) {
                workflowHistory[workflowHistory.length - 1].status = 'in-progress';
                break;
            }
        }
        if (statusKey === 'REJECTED' || statusKey === 'FRAUD') {
            const lastStage = workflowHistory[workflowHistory.length - 1];
            if (lastStage) lastStage.status = 'rejected';
        }


        const auditLog = [
            { id: 1, timestamp: new Date().toLocaleString(), action: 'Claim created', by: customer, details: `Initial claim submitted by ${customer}` },
            { id: 2, timestamp: new Date(Date.now() - 3600000).toLocaleString(), action: 'Status change', by: 'System', details: `Status updated to ${status}` },
        ];
        if (status === CLAIM_STATUSES.FRAUD.label) {
            auditLog.push({ id: 3, timestamp: new Date(Date.now() - 1800000).toLocaleString(), action: 'Fraud detected', by: USER_ROLES.ANALYST, details: 'Claim flagged for potential fraud after initial review.' });
        }


        claims.push({
            id,
            status: statusKey, // Use key for internal logic
            statusLabel: status, // Use label for display
            customer,
            vehicle,
            issue,
            amount: parseFloat(amount),
            description: `Claim for ${vehicle} by ${customer} regarding ${issue}. Estimated cost: $${amount}.`,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            files: [
                { name: 'Damage_Report.pdf', url: '#', type: 'pdf' },
                { name: 'Estimate.docx', url: '#', type: 'docx' },
            ],
            workflowHistory,
            auditLog,
        });
    }

    return claims;
};

const DUMMY_CLAIMS = generateDummyClaims(15);

// --- Component Definitions ---

const NotificationToast = ({ message, type, onClose }) => {
    if (!message) return null;

    const icon = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info',
    }[type] || 'info';

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [message, onClose]);

    return (
        <div className={`notification-toast ${type}`}>
            <Icon name={icon} />
            <span>{message}</span>
        </div>
    );
};

const KPIProgressBar = ({ value, max, label, color }) => (
    <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: 'var(--text-color-dark)' }}>
            <span>{label}</span>
            <span>{value}/{max}</span>
        </div>
        <div style={{
            height: '8px',
            borderRadius: '4px',
            backgroundColor: 'var(--border-color-light)',
            overflow: 'hidden'
        }}>
            <div style={{
                width: `${(value / max) * 100}%`,
                height: '100%',
                backgroundColor: color,
                borderRadius: '4px',
                transition: 'width 0.5s ease-out'
            }}></div>
        </div>
    </div>
);

const KPICard = ({ title, value, unit, icon, status, color, trend, onClick }) => {
    const statusClass = status ? `status-${status.replace(/\s/g, '')}` : '';
    const trendIcon = trend === 'up' ? 'up' : trend === 'down' ? 'down' : '';
    const trendColorClass = trend === 'up' ? 'up' : trend === 'down' ? 'down' : '';

    return (
        <div className={`kpi-card ${statusClass}`} onClick={onClick}>
            <div className="kpi-card-header">
                <h3>{title}</h3>
                {icon && <Icon name={icon} />}
            </div>
            <div className="kpi-card-value" style={{ color: color || 'var(--primary-color)' }}>
                {value} {unit}
                {trendIcon && <span className={`trend-indicator ${trendColorClass}`}><Icon name={trendIcon} /></span>}
            </div>
            {status && (
                <span className="kpi-card-status" style={{ backgroundColor: CLAIM_STATUSES[status.replace(/\s/g, '')]?.color || '#ccc' }}>
                    {CLAIM_STATUSES[status.replace(/\s/g, '')]?.label || status}
                </span>
            )}
        </div>
    );
};

const ChartPlaceholder = ({ title }) => (
    <div className="chart-placeholder">
        <Icon name="chart" /> {title} (Animated Chart)
    </div>
);

const ActivityCard = ({ icon, description, timestamp, status }) => (
    <div className="activity-card">
        <Icon name={icon} className="activity-icon" />
        <div className="activity-details">
            <p>{description}</p>
            <span className="timestamp">{timestamp}</span>
        </div>
        {status && <span className="status-badge" style={{ backgroundColor: CLAIM_STATUSES[status]?.color }}>{CLAIM_STATUSES[status]?.label}</span>}
    </div>
);

const TaskItem = ({ title, description, priority, status, onAction }) => (
    <li className="task-item">
        <div className="task-details">
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
        <div className="task-actions">
            <span className="status-badge" style={{ backgroundColor: CLAIM_STATUSES[status]?.color || 'var(--accent-grey)' }}>{CLAIM_STATUSES[status]?.label}</span>
            {onAction && <button className="button button-primary" onClick={onAction}>Action</button>}
        </div>
    </li>
);

const ClaimCard = ({ claim, onClick }) => {
    const statusObj = CLAIM_STATUSES[claim.status] || CLAIM_STATUSES.CREATED;
    return (
        <div className={`card status-${claim.status}`} onClick={() => onClick(claim.id)}>
            <div className="card-header-colored" style={{ backgroundColor: statusObj.color }}>
                <span>{claim.id}</span>
                <span className="status-badge" style={{ backgroundColor: statusObj.color }}>{statusObj.label}</span>
            </div>
            <div className="card-body">
                <h3 className="card-title">{claim.issue}</h3>
                <p className="card-meta"><Icon name="customer" /> {claim.customer}</p>
                <p className="card-meta"><Icon name="vehicle" /> {claim.vehicle}</p>
                <p className="card-description">{claim.description.substring(0, 100)}...</p>
            </div>
            <div className="card-footer">
                <span><Icon name="money" /> ${claim.amount.toFixed(2)}</span>
                <span><Icon name="clock" /> {new Date(claim.updatedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

const FormSection = ({ title, children, isExpanded, onToggle }) => {
    return (
        <div className="accordion-section">
            <div className={`accordion-header ${isExpanded ? 'expanded' : ''}`} onClick={onToggle}>
                {title}
                <Icon name={isExpanded ? 'collapse' : 'expand'} />
            </div>
            {isExpanded && (
                <div className="accordion-content">
                    {children}
                </div>
            )}
        </div>
    );
};

const ClaimInitiationForm = ({ onSubmit, onCancel, showToast }) => {
    const [formData, setFormData] = useState({
        customer: '',
        vehicle: '',
        issue: '',
        amount: '',
        description: '',
        files: null,
    });
    const [errors, setErrors] = useState({});
    const [expandedSections, setExpandedSections] = useState({
        customerInfo: true,
        vehicleInfo: true,
        claimDetails: true,
        attachments: true
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, files: e.target.files }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.customer) newErrors.customer = 'Customer name is required.';
        if (!formData.vehicle) newErrors.vehicle = 'Vehicle information is required.';
        if (!formData.issue) newErrors.issue = 'Claim issue is required.';
        if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid claim amount is required.';
        if (!formData.description) newErrors.description = 'Claim description is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            showToast('Claim initiated successfully!', 'success');
            onSubmit({ ...formData, status: 'Created', statusLabel: CLAIM_STATUSES.CREATED.label });
        } else {
            showToast('Please correct the form errors.', 'error');
        }
    };

    return (
        <div className="full-screen-form-container">
            <h2><Icon name="plus" /> Initiate New Claim</h2>
            <form onSubmit={handleSubmit}>
                <FormSection
                    title="Customer Information"
                    isExpanded={expandedSections.customerInfo}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, customerInfo: !prev.customerInfo }))}
                >
                    <div className="form-group">
                        <label htmlFor="customer">Customer Name <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="customer" name="customer" value={formData.customer} onChange={handleChange} />
                        {errors.customer && <span className="error-message">{errors.customer}</span>}
                    </div>
                </FormSection>

                <FormSection
                    title="Vehicle Information"
                    isExpanded={expandedSections.vehicleInfo}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, vehicleInfo: !prev.vehicleInfo }))}
                >
                    <div className="form-group">
                        <label htmlFor="vehicle">Vehicle Details (Make, Model, Year, VIN) <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="vehicle" name="vehicle" value={formData.vehicle} onChange={handleChange} />
                        {errors.vehicle && <span className="error-message">{errors.vehicle}</span>}
                    </div>
                </FormSection>

                <FormSection
                    title="Claim Details"
                    isExpanded={expandedSections.claimDetails}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, claimDetails: !prev.claimDetails }))}
                >
                    <div className="form-group">
                        <label htmlFor="issue">Claim Issue <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="issue" name="issue" value={formData.issue} onChange={handleChange} />
                        {errors.issue && <span className="error-message">{errors.issue}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="amount">Estimated Claim Amount <span style={{ color: 'red' }}>*</span></label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} />
                        {errors.amount && <span className="error-message">{errors.amount}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Detailed Description <span style={{ color: 'red' }}>*</span></label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
                        {errors.description && <span className="error-message">{errors.description}</span>}
                    </div>
                </FormSection>

                <FormSection
                    title="Attachments"
                    isExpanded={expandedSections.attachments}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, attachments: !prev.attachments }))}
                >
                    <div className="form-group">
                        <label htmlFor="files">Upload Supporting Documents</label>
                        <input type="file" id="files" name="files" multiple onChange={handleFileChange} />
                    </div>
                </FormSection>

                <div className="form-actions">
                    <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="button button-primary">Submit Claim</button>
                </div>
            </form>
        </div>
    );
};

const ReviewClaimForm = ({ claim, onSubmit, onCancel, showToast }) => {
    const [notes, setNotes] = useState('');
    const [fraudFlag, setFraudFlag] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (claim) {
            setNotes(claim.analystNotes || '');
            setFraudFlag(claim.status === 'Fraud');
        }
    }, [claim]);

    const validate = () => {
        const newErrors = {};
        if (!notes) newErrors.notes = 'Review notes are required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (newStatus) => (e) => {
        e.preventDefault();
        if (validate()) {
            showToast(`Claim ${newStatus === 'Fraud' ? 'flagged as fraud' : 'reviewed'} successfully!`, 'success');
            onSubmit(claim.id, {
                status: newStatus,
                analystNotes: notes,
                fraudFlag: fraudFlag
            });
        } else {
            showToast('Please add review notes.', 'error');
        }
    };

    if (!claim) return null;

    return (
        <div className="full-screen-form-container">
            <h2><Icon name="review" /> Review Claim: {claim.id}</h2>
            <p><strong>Customer:</strong> {claim.customer}</p>
            <p><strong>Vehicle:</strong> {claim.vehicle}</p>
            <p><strong>Issue:</strong> {claim.issue}</p>
            <p><strong>Current Status:</strong> <span className="status-badge" style={{ backgroundColor: CLAIM_STATUSES[claim.status]?.color }}>{CLAIM_STATUSES[claim.status]?.label}</span></p>

            <form>
                <div className="form-group">
                    <label htmlFor="notes">Analyst Review Notes <span style={{ color: 'red' }}>*</span></label>
                    <textarea id="notes" name="notes" value={notes} onChange={(e) => { setNotes(e.target.value); setErrors(prev => ({ ...prev, notes: '' })); }}></textarea>
                    {errors.notes && <span className="error-message">{errors.notes}</span>}
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="fraudFlag" checked={fraudFlag} onChange={(e) => setFraudFlag(e.target.checked)} />
                    <label htmlFor="fraudFlag">Flag as Potential Fraud</label>
                </div>

                <div className="form-actions">
                    <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
                    <button type="button" className="button button-primary" onClick={handleSubmit(fraudFlag ? 'Fraud' : 'Accepted')}>
                        <Icon name="check" /> Submit Review
                    </button>
                    {claim.status === 'Accepted' && (
                         <button type="button" className="button button-primary" onClick={handleSubmit('PendingApproval')}>
                            <Icon name="approval" /> Forward for Approval
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

const ApprovalForm = ({ claim, onSubmit, onCancel, showToast }) => {
    const [approvalNotes, setApprovalNotes] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (claim) {
            setApprovalNotes(claim.approvalNotes || '');
        }
    }, [claim]);

    const validate = () => {
        const newErrors = {};
        if (!approvalNotes) newErrors.approvalNotes = 'Approval/Rejection notes are required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (approved) => (e) => {
        e.preventDefault();
        if (validate()) {
            const newStatus = approved ? 'Ready' : 'Rejected';
            showToast(`Claim ${approved ? 'approved' : 'rejected'} successfully!`, 'success');
            onSubmit(claim.id, {
                status: newStatus,
                approvalNotes: approvalNotes,
                approvedBy: USER_ROLES.APPROVER,
                approvedDate: new Date().toISOString()
            });
        } else {
            showToast('Please add approval/rejection notes.', 'error');
        }
    };

    if (!claim) return null;

    return (
        <div className="full-screen-form-container">
            <h2><Icon name="approval" /> Approve / Reject Claim: {claim.id}</h2>
            <p><strong>Customer:</strong> {claim.customer}</p>
            <p><strong>Vehicle:</strong> {claim.vehicle}</p>
            <p><strong>Issue:</strong> {claim.issue}</p>
            <p><strong>Amount:</strong> ${claim.amount.toFixed(2)}</p>
            <p><strong>Current Status:</strong> <span className="status-badge" style={{ backgroundColor: CLAIM_STATUSES[claim.status]?.color }}>{CLAIM_STATUSES[claim.status]?.label}</span></p>

            <form>
                <div className="form-group">
                    <label htmlFor="approvalNotes">Approval / Rejection Notes <span style={{ color: 'red' }}>*</span></label>
                    <textarea id="approvalNotes" name="approvalNotes" value={approvalNotes} onChange={(e) => { setApprovalNotes(e.target.value); setErrors(prev => ({ ...prev, approvalNotes: '' })); }}></textarea>
                    {errors.approvalNotes && <span className="error-message">{errors.approvalNotes}</span>}
                </div>

                <div className="form-actions">
                    <button type="button" className="button button-danger" onClick={handleSubmit(false)}><Icon name="reject" /> Reject Claim</button>
                    <button type="button" className="button button-primary" onClick={handleSubmit(true)}><Icon name="check" /> Approve Claim</button>
                </div>
            </form>
        </div>
    );
};

const CalculateClaimAmountForm = ({ claim, onSubmit, onCancel, showToast }) => {
    const [finalAmount, setFinalAmount] = useState('');
    const [calculationNotes, setCalculationNotes] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (claim) {
            setFinalAmount(claim.finalAmount !== undefined ? claim.finalAmount : claim.amount);
            setCalculationNotes(claim.calculationNotes || '');
        }
    }, [claim]);

    const validate = () => {
        const newErrors = {};
        if (!finalAmount || isNaN(finalAmount) || parseFloat(finalAmount) <= 0) newErrors.finalAmount = 'A valid final amount is required.';
        if (!calculationNotes) newErrors.calculationNotes = 'Calculation notes are required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            showToast('Claim amount calculated and payment initiated!', 'success');
            onSubmit(claim.id, {
                status: 'ProcessingPayment',
                finalAmount: parseFloat(finalAmount),
                calculationNotes: calculationNotes,
                processedBy: USER_ROLES.FINANCE,
                processedDate: new Date().toISOString()
            });
        } else {
            showToast('Please correct the form errors.', 'error');
        }
    };

    if (!claim) return null;

    return (
        <div className="full-screen-form-container">
            <h2><Icon name="money" /> Calculate Claim Amount: {claim.id}</h2>
            <p><strong>Customer:</strong> {claim.customer}</p>
            <p><strong>Vehicle:</strong> {claim.vehicle}</p>
            <p><strong>Issue:</strong> {claim.issue}</p>
            <p><strong>Original Amount:</strong> ${claim.amount.toFixed(2)}</p>
            <p><strong>Current Status:</strong> <span className="status-badge" style={{ backgroundColor: CLAIM_STATUSES[claim.status]?.color }}>{CLAIM_STATUSES[claim.status]?.label}</span></p>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="finalAmount">Final Claim Amount <span style={{ color: 'red' }}>*</span></label>
                    <input type="number" id="finalAmount" name="finalAmount" value={finalAmount} onChange={(e) => { setFinalAmount(e.target.value); setErrors(prev => ({ ...prev, finalAmount: '' })); }} />
                    {errors.finalAmount && <span className="error-message">{errors.finalAmount}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="calculationNotes">Calculation Notes <span style={{ color: 'red' }}>*</span></label>
                    <textarea id="calculationNotes" name="calculationNotes" value={calculationNotes} onChange={(e) => { setCalculationNotes(e.target.value); setErrors(prev => ({ ...prev, calculationNotes: '' })); }}></textarea>
                    {errors.calculationNotes && <span className="error-message">{errors.calculationNotes}</span>}
                </div>

                <div className="form-actions">
                    <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="button button-primary"><Icon name="submit" /> Submit Calculation</button>
                </div>
            </form>
        </div>
    );
};

const ClaimDetailsScreen = ({ claim, currentUserRole, onBack, onUpdateClaimStatus, showToast }) => {
    if (!claim) return null;

    const userCanReview = userPermissions[currentUserRole]?.canReviewClaim && userPermissions[currentUserRole]?.allowedStatusesForReview.includes(claim.status);
    const userCanApproveReject = userPermissions[currentUserRole]?.canApproveRejectClaim && userPermissions[currentUserRole]?.allowedStatusesForApproval.includes(claim.status);
    const userCanCalculateAmount = userPermissions[currentUserRole]?.canCalculateClaimAmount && claim.status === 'Ready'; // Only ready for finance calculation

    const handleActionClick = (formType) => {
        onBack(formType, claim.id); // Navigate to form screen
    };

    const getWorkflowStageStatus = (stageName) => {
        const historyEntry = claim.workflowHistory.find(h => h.stage === stageName);
        if (historyEntry) return historyEntry.status;
        return 'pending';
    };

    return (
        <div className="screen-container">
            <div className="screen-header">
                <button className="back-button button-icon" onClick={() => onBack('Dashboard')}>
                    <Icon name="back" /> Back to Dashboard
                </button>
                <h1>Claim: {claim.id}</h1>
                <div className="claim-actions">
                    {userCanReview && (
                        <button className="button button-secondary" onClick={() => handleActionClick('ReviewClaimForm')}>
                            <Icon name="review" /> Review Claim
                        </button>
                    )}
                    {userCanApproveReject && (
                        <button className="button button-primary" onClick={() => handleActionClick('ApprovalForm')}>
                            <Icon name="approval" /> Approve / Reject
                        </button>
                    )}
                    {userCanCalculateAmount && (
                        <button className="button button-primary" onClick={() => handleActionClick('CalculateClaimAmountForm')}>
                            <Icon name="money" /> Calculate Amount
                        </button>
                    )}
                </div>
            </div>

            <div className="screen-content">
                <div className="detail-grid">
                    <div className="detail-main">
                        <div className="detail-summary-cards">
                            <div className="summary-card" style={{borderColor: CLAIM_STATUSES[claim.status]?.color}}>
                                <strong>Current Status</strong>
                                <span style={{color: CLAIM_STATUSES[claim.status]?.color, fontWeight: 'bold'}}>{CLAIM_STATUSES[claim.status]?.label}</span>
                            </div>
                            <div className="summary-card" style={{borderColor: 'var(--secondary-color)'}}>
                                <strong>Amount</strong>
                                <span>${claim.amount.toFixed(2)}</span>
                            </div>
                            {claim.finalAmount && (
                                <div className="summary-card" style={{borderColor: 'var(--primary-color)'}}>
                                    <strong>Final Amount</strong>
                                    <span>${claim.finalAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="summary-card" style={{borderColor: 'var(--accent-orange)'}}>
                                <strong>Created At</strong>
                                <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3><Icon name="info" /> Claim Information</h3>
                            <div className="detail-item">
                                <strong>Issue:</strong>
                                <span>{claim.issue}</span>
                            </div>
                            <div className="detail-item">
                                <strong>Description:</strong>
                                <span>{claim.description}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3><Icon name="customer" /> Customer Information</h3>
                            <div className="detail-item">
                                <strong>Customer Name:</strong>
                                <span>{claim.customer}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3><Icon name="vehicle" /> Vehicle Information</h3>
                            <div className="detail-item">
                                <strong>Vehicle Details:</strong>
                                <span>{claim.vehicle}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3><Icon name="file" /> Documents</h3>
                            {claim.files && claim.files.length > 0 ? (
                                claim.files.map((file, index) => (
                                    <div key={index} className="detail-item">
                                        <strong>File Name:</strong>
                                        <span><a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a></span>
                                    </div>
                                ))
                            ) : (
                                <p>No documents attached.</p>
                            )}
                        </div>
                    </div>

                    <div className="detail-sidebar">
                        <div className="detail-section">
                            <h3><Icon name="progress" /> Workflow Progress</h3>
                            <div className="workflow-stepper">
                                {WORKFLOW_MILESTONES.map((milestone, index) => {
                                    const stageStatus = getWorkflowStageStatus(milestone.name);
                                    return (
                                        <div key={index} className={`workflow-stage ${stageStatus}`}>
                                            <div className="workflow-stage-icon">
                                                {stageStatus === 'completed' && <Icon name="check" />}
                                                {stageStatus === 'in-progress' && <Icon name="clock" />}
                                                {stageStatus === 'pending' && index + 1}
                                                {stageStatus === 'rejected' && <Icon name="reject" />}
                                            </div>
                                            <div className="workflow-stage-details">
                                                <h4>{milestone.name}</h4>
                                                {claim.workflowHistory[index]?.date && <p>{claim.workflowHistory[index]?.date}</p>}
                                                {claim.workflowHistory[index]?.slaBreach && <span className="sla-badge">SLA BREACH!</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {userPermissions[currentUserRole]?.canViewAuditLog && (
                            <div className="detail-section">
                                <h3><Icon name="history" /> Audit Log</h3>
                                <ul className="audit-log-list">
                                    {claim.auditLog?.map(log => (
                                        <li key={log.id} className="audit-log-item">
                                            <span><strong>{log.action}</strong> by {log.by}</span>
                                            <span className="timestamp">{log.timestamp}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#555' }}>{log.details}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ currentUserRole, navigate, claimsData, showToast }) => {
    const user = userPermissions[currentUserRole];

    const getKpiData = useCallback(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        const data = {
            claimRequests: 0,
            claimClosures: 0,
            inProgressClaims: 0,
            fraudClaims: 0,
            openClaims: 0,
            closedClaims: 0,
            claimAmountByMonth: 0,
        };

        const currentMonth = new Date().getMonth();

        claimsData.forEach(claim => {
            if (new Date(claim.createdAt) > thirtyDaysAgo) {
                data.claimRequests++;
            }
            if (['Delivered', 'CustomerPicked', 'PaymentProcessed'].includes(claim.status)) {
                data.claimClosures++;
            }
            if (['Accepted', 'Ironing', 'PendingApproval', 'ProcessingPayment'].includes(claim.status)) {
                data.inProgressClaims++;
            }
            if (claim.status === 'Fraud') {
                data.fraudClaims++;
            }
            if (!['Delivered', 'CustomerPicked', 'Rejected', 'Fraud', 'PaymentProcessed'].includes(claim.status)) {
                data.openClaims++;
            }
            if (['Delivered', 'CustomerPicked', 'PaymentProcessed'].includes(claim.status)) {
                data.closedClaims++;
            }
            if (new Date(claim.createdAt).getMonth() === currentMonth) {
                data.claimAmountByMonth += claim.finalAmount || claim.amount;
            }
        });
        return data;
    }, [claimsData]);

    const kpiMetrics = getKpiData();

    const renderDashboardContent = () => {
        switch (currentUserRole) {
            case USER_ROLES.CSR:
                return (
                    <>
                        <div className="dashboard-grid">
                            <KPICard
                                title="Claim Requests"
                                value={kpiMetrics.claimRequests}
                                icon="claim"
                                color="var(--primary-color)"
                                trend="up"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Created' })}
                            />
                            <KPICard
                                title="Claim Closures"
                                value={kpiMetrics.claimClosures}
                                icon="check"
                                color="var(--primary-color)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Delivered' })}
                            />
                            <KPICard
                                title="New Claims Today"
                                value={claimsData.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).length}
                                icon="add"
                                color="var(--secondary-color)"
                                onClick={() => showToast('View claims created today.', 'info')}
                            />
                            <KPICard
                                title="Pending Follow-up"
                                value={claimsData.filter(c => ['Created', 'Accepted'].includes(c.status) && new Date(c.createdAt) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)).length}
                                icon="clock"
                                color="var(--accent-orange)"
                                onClick={() => showToast('View claims needing follow-up.', 'info')}
                            />
                        </div>
                        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <ChartPlaceholder title="Claim Status Distribution" />
                            <ChartPlaceholder title="Claims Per Month" />
                        </div>
                    </>
                );
            case USER_ROLES.ANALYST:
                return (
                    <>
                        <div className="dashboard-grid">
                            <KPICard
                                title="In-Progress Claims"
                                value={kpiMetrics.inProgressClaims}
                                icon="progress"
                                color="var(--secondary-color)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Ironing' })}
                            />
                            <KPICard
                                title="Fraud Claims"
                                value={kpiMetrics.fraudClaims}
                                icon="fraud"
                                color="var(--accent-red)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Fraud' })}
                            />
                            <KPICard
                                title="Pending Review"
                                value={claimsData.filter(c => ['Created', 'Accepted'].includes(c.status)).length}
                                icon="review"
                                color="var(--accent-orange)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Created' })}
                            />
                            <KPICard
                                title="SLA Breaches"
                                value={claimsData.filter(c => c.workflowHistory.some(s => s.slaBreach)).length}
                                icon="warning"
                                color="var(--accent-red)"
                                onClick={() => showToast('View claims with SLA breaches.', 'warning')}
                            />
                        </div>
                        <ChartPlaceholder title="Claim Status Overview" />
                    </>
                );
            case USER_ROLES.APPROVER:
                return (
                    <>
                        <div className="dashboard-grid">
                            <KPICard
                                title="In-Progress Claims"
                                value={kpiMetrics.inProgressClaims}
                                icon="progress"
                                color="var(--secondary-color)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'PendingApproval' })}
                            />
                            <KPICard
                                title="Open Claims"
                                value={kpiMetrics.openClaims}
                                icon="claim"
                                color="var(--accent-orange)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'PendingApproval' })}
                            />
                            <KPICard
                                title="Closed Claims"
                                value={kpiMetrics.closedClaims}
                                icon="check"
                                color="var(--primary-color)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Ready' })}
                            />
                            <KPICard
                                title="My Approvals This Week"
                                value={Math.floor(Math.random() * 8) + 2}
                                icon="approval"
                                color="var(--primary-color)"
                                onClick={() => showToast('View claims I approved this week.', 'info')}
                            />
                        </div>
                        <ChartPlaceholder title="Approval Status Breakdown" />
                    </>
                );
            case USER_ROLES.FINANCE:
                return (
                    <>
                        <div className="dashboard-grid">
                            <KPICard
                                title="Claim Amount by Month"
                                value={`$${kpiMetrics.claimAmountByMonth.toFixed(2)}`}
                                icon="money"
                                color="var(--primary-color)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'PaymentProcessed' })}
                            />
                            <KPICard
                                title="Ready for Payment"
                                value={claimsData.filter(c => c.status === 'Ready').length}
                                icon="money"
                                color="var(--accent-orange)"
                                onClick={() => navigate('ClaimList', { statusFilter: 'Ready' })}
                            />
                            <KPICard
                                title="Payments Processed (Last 7 Days)"
                                value={claimsData.filter(c => c.status === 'PaymentProcessed' && new Date(c.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                                icon="check"
                                color="var(--primary-color)"
                                onClick={() => showToast('View recent payments.', 'info')}
                            />
                            <KPICard
                                title="Total Outstanding Amount"
                                value={`$${claimsData.filter(c => ['Ready', 'ProcessingPayment'].includes(c.status)).reduce((sum, claim) => sum + (claim.finalAmount || claim.amount), 0).toFixed(2)}`}
                                icon="money"
                                color="var(--accent-red)"
                                onClick={() => showToast('View claims with outstanding payments.', 'warning')}
                            />
                        </div>
                        <ChartPlaceholder title="Claim by Amount Distribution" />
                    </>
                );
            default:
                return <p>Dashboard not available for this role.</p>;
        }
    };

    const filterActivities = (activities) => {
        if (!user.recentActivities || user.recentActivities.length === 0) return [];
        return activities.filter(activity => user.recentActivities.includes(activity.actionType));
    };

    const filterTasks = (tasks) => {
        if (!user.recentActivities || user.recentActivities.length === 0) return [];
        // For tasks, assume any task that matches an 'action' relevant to the user is shown
        return tasks.filter(task => {
            if (currentUserRole === USER_ROLES.CSR && task.status === 'Created') return true;
            if (currentUserRole === USER_ROLES.ANALYST && ['Created', 'Accepted'].includes(task.status)) return true;
            if (currentUserRole === USER_ROLES.APPROVER && task.status === 'PendingApproval') return true;
            if (currentUserRole === USER_ROLES.FINANCE && task.status === 'Ready') return true;
            return false;
        });
    }

    const recentActivities = [
        { id: 1, actionType: 'claim initiation', description: 'Claim #CLAIM-1001 initiated by Alice Smith', timestamp: '2 hours ago', status: 'Created' },
        { id: 2, actionType: 'Review claim', description: 'Claim #CLAIM-1005 sent for review', timestamp: 'Yesterday', status: 'Accepted' },
        { id: 3, actionType: 'approve claim', description: 'Claim #CLAIM-1002 approved by John Doe', timestamp: '3 days ago', status: 'Ready' },
        { id: 4, actionType: 'Calculate Claim amount', description: 'Claim #CLAIM-1003 payment processed', timestamp: '5 days ago', status: 'PaymentProcessed' },
        { id: 5, actionType: 'claim initiation', description: 'Claim #CLAIM-1010 created.', timestamp: '1 hour ago', status: 'Created' },
        { id: 6, actionType: 'Review claim', description: 'Claim #CLAIM-1007 flagged as fraud.', timestamp: '8 hours ago', status: 'Fraud' },
    ];

    const upcomingTasks = [
        { id: 1, title: 'Review Claim #CLAIM-1008', description: 'Engine repair needed, urgent.', status: 'Accepted', priority: 'High', dueDate: '2023-11-15' },
        { id: 2, title: 'Approve Claim #CLAIM-1009', description: 'Final approval required.', status: 'PendingApproval', priority: 'High', dueDate: '2023-11-16' },
        { id: 3, title: 'Calculate Payment #CLAIM-1006', description: 'Vehicle damage claim.', status: 'Ready', priority: 'Medium', dueDate: '2023-11-17' },
        { id: 4, title: 'Initiate new claim for Bob Johnson', description: 'Customer called about new accident.', status: 'Created', priority: 'High', dueDate: '2023-11-14' },
    ];

    return (
        <div className="main-content">
            <h1 style={{ marginBottom: var('--spacing-md'), color: 'var(--primary-color)' }}>{currentUserRole} Dashboard</h1>

            {user.canViewDashboard ? (
                <>
                    <div className="dashboard-section">
                        <h2>Key Performance Indicators</h2>
                        {renderDashboardContent()}
                    </div>

                    <div className="dashboard-section dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="recent-activities-panel">
                            <h2><Icon name="activity" /> Recent Activities</h2>
                            {filterActivities(recentActivities).length > 0 ? (
                                filterActivities(recentActivities).map(activity => (
                                    <ActivityCard
                                        key={activity.id}
                                        icon="history"
                                        description={activity.description}
                                        timestamp={activity.timestamp}
                                        status={activity.status}
                                    />
                                ))
                            ) : (<p>No recent activities for your role.</p>)}
                        </div>

                        <div className="task-queue-widget">
                            <h2><Icon name="task" /> My Task Queue</h2>
                            <ul className="task-list">
                                {filterTasks(upcomingTasks).length > 0 ? (
                                    filterTasks(upcomingTasks).map(task => (
                                        <TaskItem
                                            key={task.id}
                                            title={task.title}
                                            description={task.description}
                                            status={task.status}
                                            onAction={() => navigate('ClaimDetails', task.title.split('#')[1])}
                                        />
                                    ))
                                ) : (<p>No tasks for your role.</p>)}
                            </ul>
                        </div>
                    </div>
                </>
            ) : (
                <p>You do not have permission to view this dashboard.</p>
            )}
        </div>
    );
};


const App = () => {
    const [currentUserRole, setCurrentUserRole] = useState(null); // Initially null, forcing login
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentScreen, setCurrentScreen] = useState('Dashboard'); // 'Dashboard', 'ClaimList', 'ClaimDetails', 'ClaimForm', 'ReviewClaimForm', 'ApprovalForm', 'CalculateClaimAmountForm'
    const [selectedClaimId, setSelectedClaimId] = useState(null);
    const [claims, setClaims] = useState(DUMMY_CLAIMS);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        // Clear after showing. The NotificationToast component handles its own dismiss.
        setTimeout(() => setToast({ message: '', type: '' }), 5500);
    };

    const handleLogin = (role) => {
        setCurrentUserRole(role);
        setIsAuthenticated(true);
        setCurrentScreen('Dashboard');
        showToast(`Logged in as ${role}`, 'success');
    };

    const navigate = (screen, id = null) => {
        setSelectedClaimId(id);
        setCurrentScreen(screen);
    };

    const handleClaimFormSubmit = (newClaimData) => {
        const newClaim = {
            id: `CLAIM-${1000 + claims.length + 1}`,
            ...newClaimData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            statusLabel: CLAIM_STATUSES[newClaimData.status]?.label,
            workflowHistory: [{ stage: 'Claim Created', status: 'in-progress', date: new Date().toISOString().split('T')[0], by: newClaimData.customer, notes: 'Initial submission' }],
            auditLog: [{ id: 1, timestamp: new Date().toLocaleString(), action: 'Claim created', by: newClaimData.customer, details: `Initial claim submitted by ${newClaimData.customer}` }],
        };

        setClaims(prevClaims => [...prevClaims, newClaim]);
        navigate('Dashboard');
        showToast('New Claim Created!', 'success');
    };

    const handleClaimUpdate = (claimId, updates) => {
        setClaims(prevClaims => prevClaims.map(claim => {
            if (claim.id === claimId) {
                const updatedClaim = {
                    ...claim,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                    statusLabel: CLAIM_STATUSES[updates.status]?.label || claim.statusLabel,
                };

                // Update workflow history
                const currentWorkflowIndex = WORKFLOW_MILESTONES.findIndex(m => m.status === updatedClaim.status);
                updatedClaim.workflowHistory = updatedClaim.workflowHistory.map((entry, index) => {
                    if (index < currentWorkflowIndex) {
                        return { ...entry, status: 'completed' };
                    } else if (index === currentWorkflowIndex) {
                        return { ...entry, status: 'in-progress', date: entry.date || new Date().toISOString().split('T')[0], by: entry.by || currentUserRole, notes: updates.notes || entry.notes };
                    } else {
                        return { ...entry, status: 'pending', date: null, by: null, notes: '' };
                    }
                });

                // Add audit log entry
                updatedClaim.auditLog.push({
                    id: updatedClaim.auditLog.length + 1,
                    timestamp: new Date().toLocaleString(),
                    action: `Status change to ${updatedClaim.statusLabel}`,
                    by: currentUserRole,
                    details: `Claim status updated to ${updatedClaim.statusLabel}. ${updates.approvalNotes || updates.analystNotes || updates.calculationNotes || ''}`
                });

                return updatedClaim;
            }
            return claim;
        }));
        navigate('ClaimDetails', claimId); // Go back to updated claim details
        showToast('Claim Updated Successfully!', 'success');
    };

    const currentClaim = selectedClaimId ? claims.find(c => c.id === selectedClaimId) : null;

    const renderScreen = () => {
        if (!isAuthenticated) {
            return <LoginScreen onLogin={handleLogin} />;
        }

        switch (currentScreen) {
            case 'Dashboard':
                return <Dashboard currentUserRole={currentUserRole} navigate={navigate} claimsData={claims} showToast={showToast} />;
            case 'ClaimList':
                const filteredClaims = claims.filter(claim => {
                    const statusFilter = selectedClaimId?.statusFilter;
                    if (statusFilter) {
                        return claim.status === statusFilter;
                    }
                    if (currentUserRole === USER_ROLES.ANALYST) {
                        return userPermissions[currentUserRole].allowedStatusesForReview.includes(claim.status) || claim.status === 'Fraud';
                    }
                    if (currentUserRole === USER_ROLES.APPROVER) {
                        return userPermissions[currentUserRole].allowedStatusesForApproval.includes(claim.status);
                    }
                    if (currentUserRole === USER_ROLES.FINANCE) {
                        return ['Ready', 'ProcessingPayment', 'PaymentProcessed'].includes(claim.status);
                    }
                    return true; // CSR can see all claims they create or are involved in
                });

                return (
                    <div className="screen-container">
                        <div className="screen-header">
                            <button className="back-button button-icon" onClick={() => navigate('Dashboard')}>
                                <Icon name="back" /> Back to Dashboard
                            </button>
                            <h1><Icon name="claim" /> Claim Details ({selectedClaimId?.statusFilter || 'All'})</h1>
                            {userPermissions[currentUserRole].canInitiateClaim && (
                                <button className="button button-primary" onClick={() => navigate('ClaimForm')}><Icon name="add" /> New Claim</button>
                            )}
                        </div>
                        <div className="screen-content">
                            <div className="cards-grid">
                                {filteredClaims.length > 0 ? (
                                    filteredClaims.map(claim => (
                                        <ClaimCard key={claim.id} claim={claim} onClick={(id) => navigate('ClaimDetails', id)} />
                                    ))
                                ) : (
                                    <p>No claims found for this filter/role.</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'ClaimDetails':
                return (
                    <ClaimDetailsScreen
                        claim={currentClaim}
                        currentUserRole={currentUserRole}
                        onBack={navigate}
                        onUpdateClaimStatus={handleClaimUpdate}
                        showToast={showToast}
                    />
                );
            case 'ClaimForm':
                return (
                    <div className="screen-container">
                        <div className="screen-header">
                            <button className="back-button button-icon" onClick={() => navigate('Dashboard')}>
                                <Icon name="back" /> Back
                            </button>
                            <h1>Initiate New Claim</h1>
                        </div>
                        <div className="screen-content">
                            <ClaimInitiationForm onSubmit={handleClaimFormSubmit} onCancel={() => navigate('Dashboard')} showToast={showToast} />
                        </div>
                    </div>
                );
            case 'ReviewClaimForm':
                return (
                    <div className="screen-container">
                        <div className="screen-header">
                            <button className="back-button button-icon" onClick={() => navigate('ClaimDetails', selectedClaimId)}>
                                <Icon name="back" /> Back to Claim
                            </button>
                            <h1>Review Claim: {selectedClaimId}</h1>
                        </div>
                        <div className="screen-content">
                            <ReviewClaimForm claim={currentClaim} onSubmit={handleClaimUpdate} onCancel={() => navigate('ClaimDetails', selectedClaimId)} showToast={showToast} />
                        </div>
                    </div>
                );
            case 'ApprovalForm':
                return (
                    <div className="screen-container">
                        <div className="screen-header">
                            <button className="back-button button-icon" onClick={() => navigate('ClaimDetails', selectedClaimId)}>
                                <Icon name="back" /> Back to Claim
                            </button>
                            <h1>Approval for Claim: {selectedClaimId}</h1>
                        </div>
                        <div className="screen-content">
                            <ApprovalForm claim={currentClaim} onSubmit={handleClaimUpdate} onCancel={() => navigate('ClaimDetails', selectedClaimId)} showToast={showToast} />
                        </div>
                    </div>
                );
            case 'CalculateClaimAmountForm':
                return (
                    <div className="screen-container">
                        <div className="screen-header">
                            <button className="back-button button-icon" onClick={() => navigate('ClaimDetails', selectedClaimId)}>
                                <Icon name="back" /> Back to Claim
                            </button>
                            <h1>Calculate Amount for Claim: {selectedClaimId}</h1>
                        </div>
                        <div className="screen-content">
                            <CalculateClaimAmountForm claim={currentClaim} onSubmit={handleClaimUpdate} onCancel={() => navigate('ClaimDetails', selectedClaimId)} showToast={showToast} />
                        </div>
                    </div>
                );
            default:
                return <div>Screen not found.</div>;
        }
    };

    return (
        <div className="app-container">
            {isAuthenticated && (
                <header className="app-header">
                    <div className="app-header-left">
                        <a href="#" className="app-logo" onClick={() => navigate('Dashboard')}>AutoServiceClaim</a>
                        <div className="global-search">
                            <input type="text" placeholder="Search claims, customers..." />
                            <Icon name="search" />
                        </div>
                    </div>
                    <div className="app-header-right">
                        <div className="role-switcher">
                            <select value={currentUserRole} onChange={(e) => handleLogin(e.target.value)}>
                                {Object.values(USER_ROLES).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <div className="theme-switcher">
                            <button onClick={() => setIsDarkMode(prev => !prev)}>
                                <Icon name={isDarkMode ? 'sun' : 'moon'} />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {renderScreen()}

            <div className="notification-toast-container">
                <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
            </div>
        </div>
    );
};

const LoginScreen = ({ onLogin }) => {
    const [selectedRole, setSelectedRole] = useState(Object.values(USER_ROLES)[0]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(selectedRole);
    };

    return (
        <div className="login-screen">
            <div className="login-card">
                <h2>Welcome to AutoServiceClaim</h2>
                <p>Please select your role to continue.</p>
                <form onSubmit={handleSubmit}>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                        {Object.values(USER_ROLES).map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default App;