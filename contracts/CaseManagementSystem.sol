// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CaseManagementSystem
 * @dev Private case management system with granular access control
 */
contract CaseManagementSystem {
    //--------------- Custom Errors ---------------//
    error CaseManagement__OnlyOwner();
    error CaseManagement__OnlyWriteAccess();
    error CaseManagement__OnlyReadAccess();
    error CaseManagement__InvalidAddress();
    error CaseManagement__CannotModifyOwnerAccess();
    error CaseManagement__CannotRevokeOwnerAccess();
    error CaseManagement__EmptyCaseName();
    error CaseManagement__CaseIdAlreadyExists();
    error CaseManagement__CaseDoesNotExist();
    error CaseManagement__CaseNotActive();
    error CaseManagement__StatusAlreadySet();
    error CaseManagement__InvalidEvidence();
    error CaseManagement__CaseNotFound();

    //--------------- Enums ---------------//
    enum CaseStatus {
        OPEN,
        INPROGRESS,
        PENDING,
        BLOCKED,
        CLOSED
    }

    enum UserType {
        EXAMINER,
        INVESTIGATOR,
        ENDUSER,
        OTHER
    }

    //--------------- Structs ---------------//
    struct UserDetails {
        UserType userType;
        string otherUserType; // Only used if userType is OTHER
        string name;
        string phone;
        string email;
        string orgDeptId;
        string organizationName;
        string pointOfContact;
        string designation;
        string department;
        address walletAddress;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct EvidenceData {
        string fileName;
        string fileType;
        string ipfsCID; // IPFS hash from Pinata
        uint256 size; // Size in bytes
        uint256 timestamp; // When evidence was added
        string otherMetadata; // Additional metadata as JSON string
        address submittedBy;
    }

    struct Case {
        uint256 id;
        string caseId; // External case ID
        string caseName;
        UserDetails userDetails;
        EvidenceData[] evidence;
        CaseStatus status;
        address createdBy;
        uint256 createdAt;
        uint256 updatedAt;
        bool isActive;
    }

    //--------------- State Variables ---------------//
    address public i_owner;
    address[] private s_addressesWithAccess;

    // Access Control - Private state
    mapping(address => bool) private s_writeAccess;
    mapping(address => bool) private s_readAccess;

    // Case Management - Private state
    mapping(uint256 => Case) private s_cases;
    mapping(string => uint256) private s_caseIdToIndex; // External case ID to internal ID
    mapping(address => uint256[]) private s_userCases; // Cases created by user

    uint256 private s_caseCounter;

    //--------------- Events ---------------//
    event CaseCreated(
        uint256 indexed caseId,
        string indexed externalCaseId,
        address indexed createdBy
    );
    event CaseUpdated(
        uint256 indexed caseId,
        CaseStatus newStatus,
        address indexed updatedBy
    );
    event EvidenceAdded(
        uint256 indexed caseId,
        string ipfsCID,
        address indexed addedBy
    );
    event AccessGranted(
        address indexed user,
        bool writeAccess,
        bool readAccess,
        address indexed grantedBy
    );
    event AccessRevoked(address indexed user, address indexed revokedBy);

    //--------------- Modifiers ---------------//
    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert CaseManagement__OnlyOwner();
        }
        _;
    }

    modifier onlyWriteAccess() {
        if (!s_writeAccess[msg.sender] && msg.sender != i_owner) {
            revert CaseManagement__OnlyWriteAccess();
        }
        _;
    }

    modifier onlyReadAccess() {
        if (
            !s_readAccess[msg.sender] &&
            !s_writeAccess[msg.sender] &&
            msg.sender != i_owner
        ) {
            revert CaseManagement__OnlyReadAccess();
        }
        _;
    }

    modifier caseExists(uint256 _caseId) {
        if (_caseId == 0 || _caseId > s_caseCounter) {
            revert CaseManagement__CaseDoesNotExist();
        }
        if (!s_cases[_caseId].isActive) {
            revert CaseManagement__CaseNotActive();
        }
        _;
    }

    //--------------- Constructor ---------------//
    constructor() {
        i_owner = msg.sender;

        // Grant owner full access
        s_writeAccess[msg.sender] = true;
        s_readAccess[msg.sender] = true;
    }

    //--------------- Access Control Functions (Private) ---------------//

    function grantAccess(
        address _user,
        bool _writeAccess,
        bool _readAccess
    ) external onlyOwner {
        if (_user == address(0)) {
            revert CaseManagement__InvalidAddress();
        }
        if (_user == i_owner) {
            revert CaseManagement__CannotModifyOwnerAccess();
        }

        // Check if this is a new address being granted access
        bool isNewAddress = !s_writeAccess[_user] && !s_readAccess[_user];

        if (_writeAccess) {
            s_writeAccess[_user] = true;
        }

        if (_readAccess) {
            s_readAccess[_user] = true;
        }

        // Add to tracking array if it's a new address
        if (isNewAddress && (_writeAccess || _readAccess)) {
            s_addressesWithAccess.push(_user);
        }

        emit AccessGranted(_user, _writeAccess, _readAccess, msg.sender);
    }

    function revokeAccess(address _user) external onlyOwner {
    if (_user == i_owner) {
        revert CaseManagement__CannotRevokeOwnerAccess();
    }

    for (uint256 i = 0; i < s_addressesWithAccess.length; i++) {
        if (s_addressesWithAccess[i] == _user) {
            if (i != s_addressesWithAccess.length - 1) {
                s_addressesWithAccess[i] = s_addressesWithAccess[s_addressesWithAccess.length - 1];
            }
            s_addressesWithAccess.pop();
            break;
        }
    }

    delete s_writeAccess[_user];
    delete s_readAccess[_user];

    emit AccessRevoked(_user, msg.sender);
}

    function getAccessList() external view returns (address[] memory) {
        return s_addressesWithAccess;
    }

    function getAccessDetails(
        address _user
    ) external view returns (bool _hasWriteAccess, bool _hasReadAccess) {
        return (s_writeAccess[_user], s_readAccess[_user]);
    }

    function getAccessListPaginated(
        uint256 _offset,
        uint256 _limit
    ) external view returns (address[] memory, bool[] memory, bool[] memory) {
        uint256 end = _offset + _limit;
        if (end > s_addressesWithAccess.length) {
            end = s_addressesWithAccess.length;
        }

        uint256 resultLength = end - _offset;
        address[] memory addresses = new address[](resultLength);
        bool[] memory writeAccess = new bool[](resultLength);
        bool[] memory readAccess = new bool[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            address user = s_addressesWithAccess[_offset + i];
            addresses[i] = user;
            writeAccess[i] = s_writeAccess[user];
            readAccess[i] = s_readAccess[user];
        }

        return (addresses, writeAccess, readAccess);
    }

    /**
     * @dev Check if address has write access
     */
    function hasWriteAccess(address _user) external view returns (bool) {
        if (_user == i_owner) return true;
        return s_writeAccess[_user];
    }

    /**
     * @dev Check if address has read access
     */
    function hasReadAccess(address _user) external view returns (bool) {
        if (_user == i_owner) return true;
        return s_readAccess[_user] || s_writeAccess[_user];
    }

    //--------------- Case Management Functions (Private) ---------------//
    /**
     * @dev Create a new case (Requires write access)
     */
    function createCase(
        string memory _caseId,
        string memory _caseName,
        UserDetails memory _userDetails,
        EvidenceData memory _initialEvidence
    ) external onlyWriteAccess returns (uint256) {
        if (bytes(_caseName).length == 0) {
            revert CaseManagement__EmptyCaseName();
        }
        if (s_caseIdToIndex[_caseId] != 0) {
            revert CaseManagement__CaseIdAlreadyExists();
        }

        s_caseCounter++;
        uint256 newCaseId = s_caseCounter;

        // Store user details
        UserDetails memory userDetails = UserDetails({
            userType: _userDetails.userType,
            otherUserType: _userDetails.otherUserType,
            name: _userDetails.name,
            phone: _userDetails.phone,
            email: _userDetails.email,
            orgDeptId: _userDetails.orgDeptId,
            organizationName: _userDetails.organizationName,
            pointOfContact: _userDetails.pointOfContact,
            designation: _userDetails.designation,
            department: _userDetails.department,
            walletAddress: msg.sender,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Create evidence array with initial evidence if provided
        // EvidenceData[] memory evidence = new EvidenceData[](0);

        // Create case
        Case storage newCase = s_cases[newCaseId];
        newCase.id = newCaseId;
        newCase.caseId = _caseId;
        newCase.caseName = _caseName;
        newCase.userDetails = userDetails;
        newCase.status = CaseStatus.OPEN;
        newCase.createdBy = msg.sender;
        newCase.createdAt = block.timestamp;
        newCase.updatedAt = block.timestamp;
        newCase.isActive = true;

        // Add initial evidence if provided
        if (
            bytes(_initialEvidence.fileName).length > 0 ||
            bytes(_initialEvidence.ipfsCID).length > 0
        ) {
            addEvidenceInternal(newCaseId, _initialEvidence);
        }

        // Update mappings
        s_caseIdToIndex[_caseId] = newCaseId;
        s_userCases[msg.sender].push(newCaseId);

        emit CaseCreated(newCaseId, _caseId, msg.sender);

        return newCaseId;
    }

    /**
     * @dev Add evidence to a case (Requires write access)
     */
    function addEvidence(
        uint256 _caseId,
        EvidenceData memory _evidence
    ) external onlyWriteAccess caseExists(_caseId) {
        addEvidenceInternal(_caseId, _evidence);
    }

    /**
     * @dev Internal function to add evidence
     */
    function addEvidenceInternal(
        uint256 _caseId,
        EvidenceData memory _evidence
    ) private {
        if (
            bytes(_evidence.fileName).length == 0 &&
            bytes(_evidence.ipfsCID).length == 0
        ) {
            revert CaseManagement__InvalidEvidence();
        }

        EvidenceData memory evidence = EvidenceData({
            fileName: _evidence.fileName,
            fileType: _evidence.fileType,
            ipfsCID: _evidence.ipfsCID,
            size: _evidence.size,
            timestamp: block.timestamp,
            otherMetadata: _evidence.otherMetadata,
            submittedBy: msg.sender
        });

        s_cases[_caseId].evidence.push(evidence);
        s_cases[_caseId].updatedAt = block.timestamp;

        emit EvidenceAdded(_caseId, _evidence.ipfsCID, msg.sender);
    }

    /**
     * @dev Update case status (Requires write access)
     */
    function updateCaseStatus(
        uint256 _caseId,
        CaseStatus _newStatus
    ) external onlyWriteAccess caseExists(_caseId) {
        if (s_cases[_caseId].status == _newStatus) {
            revert CaseManagement__StatusAlreadySet();
        }

        s_cases[_caseId].status = _newStatus;
        s_cases[_caseId].updatedAt = block.timestamp;

        emit CaseUpdated(_caseId, _newStatus, msg.sender);
    }

    /**
     * @dev Update user details for a case (Requires write access)
     */
    function updateUserDetails(
        uint256 _caseId,
        UserDetails memory _updatedDetails
    ) external onlyWriteAccess caseExists(_caseId) {
        Case storage targetCase = s_cases[_caseId];

        // Update only provided fields
        if (bytes(_updatedDetails.name).length > 0) {
            targetCase.userDetails.name = _updatedDetails.name;
        }
        if (bytes(_updatedDetails.phone).length > 0) {
            targetCase.userDetails.phone = _updatedDetails.phone;
        }
        if (bytes(_updatedDetails.email).length > 0) {
            targetCase.userDetails.email = _updatedDetails.email;
        }
        if (bytes(_updatedDetails.orgDeptId).length > 0) {
            targetCase.userDetails.orgDeptId = _updatedDetails.orgDeptId;
        }
        if (bytes(_updatedDetails.organizationName).length > 0) {
            targetCase.userDetails.organizationName = _updatedDetails
                .organizationName;
        }
        if (bytes(_updatedDetails.pointOfContact).length > 0) {
            targetCase.userDetails.pointOfContact = _updatedDetails
                .pointOfContact;
        }
        if (bytes(_updatedDetails.designation).length > 0) {
            targetCase.userDetails.designation = _updatedDetails.designation;
        }
        if (bytes(_updatedDetails.department).length > 0) {
            targetCase.userDetails.department = _updatedDetails.department;
        }

        targetCase.userDetails.updatedAt = block.timestamp;
        targetCase.updatedAt = block.timestamp;
    }

    //--------------- View Functions (Private - Require Read Access) ---------------//
    /**
     * @dev Get complete case details (Requires read access)
     */
    function getCase(
        uint256 _caseId
    ) external view onlyReadAccess caseExists(_caseId) returns (Case memory) {
        return s_cases[_caseId];
    }

    /**
     * @dev Get case by external case ID (Requires read access)
     */
    function getCaseByExternalId(
        string memory _caseId
    ) external view onlyReadAccess returns (Case memory) {
        uint256 internalId = s_caseIdToIndex[_caseId];
        if (internalId == 0) {
            revert CaseManagement__CaseNotFound();
        }
        if (!s_cases[internalId].isActive) {
            revert CaseManagement__CaseNotActive();
        }

        return s_cases[internalId];
    }

    /**
     * @dev Get evidence for a case (Requires read access)
     */
    function getCaseEvidence(
        uint256 _caseId,
        uint256 _offset,
        uint256 _limit
    )
        external
        view
        onlyReadAccess
        caseExists(_caseId)
        returns (EvidenceData[] memory)
    {
        EvidenceData[] storage allEvidence = s_cases[_caseId].evidence;

        if (_offset >= allEvidence.length) {
            return new EvidenceData[](0);
        }

        uint256 end = _offset + _limit;
        if (end > allEvidence.length) {
            end = allEvidence.length;
        }

        uint256 resultLength = end - _offset;
        EvidenceData[] memory result = new EvidenceData[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allEvidence[_offset + i];
        }

        return result;
    }

    /**
     * @dev Get cases created by a user (Requires read access)
     */
    function getCasesByCreator(
        address _creator,
        uint256 _offset,
        uint256 _limit
    ) external view onlyReadAccess returns (Case[] memory) {
        uint256[] storage caseIds = s_userCases[_creator];

        if (_offset >= caseIds.length) {
            return new Case[](0);
        }

        uint256 end = _offset + _limit;
        if (end > caseIds.length) {
            end = caseIds.length;
        }

        uint256 resultLength = end - _offset;
        Case[] memory result = new Case[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = s_cases[caseIds[_offset + i]];
        }

        return result;
    }

    /**
     * @dev Get total case count
     */
    function getTotalCases() external view onlyReadAccess returns (uint256) {
        return s_caseCounter;
    }

    /**
     * @dev Check if a case exists
     */
    function caseIdExists(
        string memory _caseId
    ) external view onlyReadAccess returns (bool) {
        uint256 internalId = s_caseIdToIndex[_caseId];
        return internalId > 0 && s_cases[internalId].isActive;
    }

    //--------------- Admin Functions (Private - Only Owner) ---------------//
    /**
     * @dev Deactivate a case (Only owner)
     */
    function deactivateCase(
        uint256 _caseId
    ) external onlyOwner caseExists(_caseId) {
        s_cases[_caseId].isActive = false;
        s_cases[_caseId].updatedAt = block.timestamp;
    }

    /**
     * @dev Get owner address
     */
    function owner() external view returns (address) {
        return i_owner;
    }

    function changeOwner(address _newOwner) external onlyOwner {
        i_owner = _newOwner;
    }
}
