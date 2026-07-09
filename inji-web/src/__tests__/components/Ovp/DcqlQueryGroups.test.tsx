import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DcqlQueryGroups from '../../../components/Ovp/DcqlQueryGroups';
import { DcqlQueryGroup } from '../../../types/dcql';
import { WalletCredential } from '../../../types/data';

jest.mock('../../../components/Ovp/QueryGroupSection', () => ({
    QueryGroupSection: ({ group, defaultExpanded }: any) => (
        <div
            data-testid={`mock-query-group-section-${group.queryId}`}
            data-expanded={String(defaultExpanded)}
        />
    ),
}));

const makeCredential = (id: string): WalletCredential => ({
    credentialId: id,
    credentialTypeDisplayName: `Credential ${id}`,
    credentialTypeLogo: '/logo.png',
    issuerDisplayName: 'Issuer',
    issuerLogo: '/issuer-logo.png',
    format: 'ldp_vc',
});

const makeGroup = (queryId: string, required: boolean): DcqlQueryGroup => ({
    queryId,
    required,
    multiple: false,
    availableCredentials: [makeCredential(`${queryId}-cred`)],
    missingClaims: [],
});

describe('DcqlQueryGroups', () => {
    const mockOnCredentialSelect = jest.fn();

    const defaultProps = {
        queryGroups: [
            makeGroup('national-id', true),
            makeGroup('insurance', false),
        ],
        selection: {},
        onCredentialSelect: mockOnCredentialSelect,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the main container', () => {
        render(<DcqlQueryGroups {...defaultProps} />);
        expect(screen.getByTestId('dcql-query-groups')).toBeInTheDocument();
    });

    it('renders mandatory group sections', () => {
        render(<DcqlQueryGroups {...defaultProps} />);
        expect(screen.getByTestId('mock-query-group-section-national-id')).toBeInTheDocument();
    });

    it('renders optional group sections', () => {
        render(<DcqlQueryGroups {...defaultProps} />);
        expect(screen.getByTestId('mock-query-group-section-insurance')).toBeInTheDocument();
    });

    it('passes defaultExpanded=true to mandatory groups', () => {
        render(<DcqlQueryGroups {...defaultProps} />);
        expect(screen.getByTestId('mock-query-group-section-national-id')).toHaveAttribute('data-expanded', 'true');
    });

    it('passes defaultExpanded=false to optional groups', () => {
        render(<DcqlQueryGroups {...defaultProps} />);
        expect(screen.getByTestId('mock-query-group-section-insurance')).toHaveAttribute('data-expanded', 'false');
    });

    it('renders all groups when all are mandatory', () => {
        const allRequired = [makeGroup('a', true), makeGroup('b', true)];
        render(<DcqlQueryGroups {...defaultProps} queryGroups={allRequired} />);
        expect(screen.getByTestId('mock-query-group-section-a')).toBeInTheDocument();
        expect(screen.getByTestId('mock-query-group-section-b')).toBeInTheDocument();
    });

    it('renders all groups when all are optional', () => {
        const allOptional = [makeGroup('x', false), makeGroup('y', false)];
        render(<DcqlQueryGroups {...defaultProps} queryGroups={allOptional} />);
        expect(screen.getByTestId('mock-query-group-section-x')).toBeInTheDocument();
        expect(screen.getByTestId('mock-query-group-section-y')).toBeInTheDocument();
    });

    it('renders nothing when queryGroups is empty', () => {
        render(<DcqlQueryGroups {...defaultProps} queryGroups={[]} />);
        expect(screen.getByTestId('dcql-query-groups')).toBeInTheDocument();
        expect(screen.queryByTestId(/mock-query-group-section/)).not.toBeInTheDocument();
    });
});
