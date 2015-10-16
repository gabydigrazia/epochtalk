module.exports = ['$rootScope', '$scope', '$location', 'Session', 'Alert', 'AdminRoles', 'AdminUsers', 'roles', 'userData', 'roleId', 'limit', 'page', 'search', function($rootScope, $scope, $location, Session, Alert, AdminRoles, AdminUsers, roles, userData, roleId, limit, page, search) {
  var ctrl = this;
  this.parent = $scope.$parent.AdminManagementCtrl;
  this.parent.tab = 'roles';
  this.roles = roles;
  this.backupPriorities = angular.copy(roles);
  this.queryParams = $location.search();
  this.pageCount = Math.ceil(userData.count / limit);
  this.page = page;
  this.limit = limit;
  this.userData = userData;
  this.search = search;
  this.searchStr = search;
  this.roleId = roleId;
  this.selectedRole = null;
  this.showAddUsers = false;
  this.controlAccess = Session.getControlAccessWithPriority('roleControls');
  this.controlAccess.privilegedRemoveRoles = this.controlAccess.privilegedAddRoles ? {
    samePriority: Session.hasPermission('roleControls.privilegedRemoveRoles.samePriority'),
    lowerPriority: Session.hasPermission('roleControls.privilegedRemoveRoles.lowerPriority')
  } : undefined;
  this.controlAccess.privilegedAddRoles = this.controlAccess.privilegedAddRoles ? {
    samePriority: Session.hasPermission('roleControls.privilegedAddRoles.samePriority'),
    lowerPriority: Session.hasPermission('roleControls.privilegedAddRoles.lowerPriority')
  } : undefined;

  this.canViewAddUsersControl = function() {
    var view = false;
    if (ctrl.controlAccess.privilegedAddRoles && ctrl.controlAccess.privilegedAddRoles.samePriority) {
      view = ctrl.selectedRole.priority >= Session.user.permissions.priority;
    }
    else if (ctrl.controlAccess.privilegedAddRoles && ctrl.controlAccess.privilegedAddRoles.lowerPriority) {
      view = ctrl.selectedRole.priority > Session.user.permissions.priority;
    }
    if (ctrl.showAddUsers) { ctrl.showAddUsers = view; }
    return view;
  };

  this.processUsers = function(userData) {
    if (userData && userData.users) {
      userData.users.forEach(function(user) {
        user.remove = false;
        if (ctrl.controlAccess.privilegedRemoveRoles && ctrl.controlAccess.privilegedRemoveRoles.samePriority) {
          user.remove = user.priority >= Session.user.permissions.priority;
        }
        else if (ctrl.controlAccess.privilegedRemoveRoles && ctrl.controlAccess.privilegedRemoveRoles.lowerPriority) {
          user.remove = user.priority > Session.user.permissions.priority;
        }
      });
    }
  };

  this.processUsers(this.userData);

  this.searchUsers = function() {
    if (!ctrl.searchStr || ctrl.searchStr && !ctrl.searchStr.length) {
      ctrl.clearSearch();
      return;
    }
    ctrl.queryParams.search = ctrl.searchStr;
    $location.search(ctrl.queryParams);
  };

  this.clearSearch = function() {
    ctrl.queryParams.search = undefined;
    $location.search(ctrl.queryParams);
    ctrl.searchStr = null;
  };

  this.addUsers = function() {
    var users = [];
    ctrl.usersToAdd.forEach(function(user) { users.push(user.text); });

    AdminUsers.addRoles({ usernames: users, role_id: ctrl.roleId }).$promise
    .then(function() {
      Alert.success('Users successfully added to ' + ctrl.selectedRole.name + ' role.');
      ctrl.pullPage();
    })
    .catch(function(err) {
      var message = 'There was an error adding users to ' + ctrl.selectedRole.name + ' role.';
      if (err && err.data && err.data.message) { message = err.data.message; }
      Alert.error(message);
    })
    .finally(function() { ctrl.usersToAdd = null; });
  };

  this.removeUser = function(user) {
    AdminUsers.removeRoles({ user_id: user.id, role_id: ctrl.roleId }).$promise
    .then(function() {
      Alert.success('User ' + user.username + ' successfully removed from ' + ctrl.selectedRole.name + ' role.');
      ctrl.pullPage();
    })
    .catch(function(err) {
      var message = 'There was an error removing ' + user.username + ' from ' + ctrl.selectedRole.name + ' role.';
      if (err && err.data && err.data.message) { message = err.data.message; }
      Alert.error(message);
    });
  };

  this.loadTags = function(query) {
    return AdminUsers.searchUsernames({ username: query }).$promise;
  };

  this.selectRole = function(role) {
    // reset defaults when deselecting or reselecting
    ctrl.page = page;
    ctrl.limit = limit;
    ctrl.clearSearch();
    if (ctrl.selectedRole && ctrl.selectedRole.name === role.name) {
      ctrl.selectedRole = null;
      ctrl.userData = null;
      ctrl.queryParams = {};
      $location.search(ctrl.queryParams);
    }
    else {
      ctrl.selectedRole = role;
      ctrl.queryParams = { roleId: role.id };
      $location.search(ctrl.queryParams);
    }
  };

  // Assign selected role if view is visited with roleId query param
  roles.forEach(function(role) {
    if (roleId && roleId === role.id) {
      ctrl.selectedRole = role;
      $location.search(ctrl.queryParams);
    }
    if (role.lookup === 'user') {
      role.message = 'The ' + role.name + ' role is assigned by default.  By default all new registered users are considered users.  The userbase of this role may not be manually edited.  Permission changes to this role will affect all users without another role assigned.';
    }
    if (role.lookup === 'anonymous') {
      role.message = 'The ' + role.name + ' role is assigned by default to forum visitors who are not authenticated.  The user base of this role may not be manually edited.  Permission changes to this role will affect all unauthenticated users visiting the forum.';
    }
    if (role.lookup === 'private') {
      role.message = 'The ' + role.name + ' role is assigned by default to forum visitors who are not authenticated.  This role is only used if the "Public Forum" is set to off via the forum settings page.  This requires all visitors to log in before they can view the forum content.  The user base of this role may not be manually edited.  Permission changes to this role will affect all unauthenticated users visiting the forum.';
    }
  });

  this.resetPriority = function() { ctrl.roles = angular.copy(ctrl.backupPriorities); };

  this.savePriority = function() {
    AdminRoles.reprioritize(ctrl.roles).$promise
    .then(function() {
      Alert.success('Roles successfully reprioritized');
      ctrl.backupPriorities = angular.copy(ctrl.roles);
    })
    .catch(function() {
      Alert.error('There was an error reprioritizing the roles');
    });
  };

  this.reprioritizeRoles = function() {
    if (ctrl.controlAccess.reprioritize) {
      var priority = 0;
      ctrl.roles.forEach(function(role) {
        role.priority = priority++;
      });
    }
    else { ctrl.resetPriority(); }
  };

  this.showAddRoleModal = false;
  this.selectedTab = null;
  this.showAddRole = function() {
    ctrl.showAddRoleModal = true;
    ctrl.selectedTab = 'user';
  };

  this.closeAddRole = function() { ctrl.showAddRoleModal = false; };

  this.offLCS = $rootScope.$on('$locationChangeSuccess', function() {
    var params = $location.search();
    var page = Number(params.page) || 1;
    var limit = Number(params.limit) || 15;
    var search = params.search;
    var roleId = params.roleId;
    var roleIdChanged = false;
    var pageChanged = false;
    var searchChanged = false;
    var limitChanged = false;

    if (page && page !== ctrl.page) {
      pageChanged = true;
      ctrl.page = page;
    }
    if (limit && limit !== ctrl.limit) {
      limitChanged = true;
      ctrl.limit = limit;
    }
    if (roleId && roleId !== ctrl.roleId) {
      roleIdChanged = true;
      ctrl.roleId = roleId;
    }
    if (!roleId) { ctrl.roleId = null; } // allows deselection of role
    if ((search === undefined || search) && search !== ctrl.search) {
      searchChanged = true;
      ctrl.search = search;
    }

    if(pageChanged || limitChanged || roleIdChanged || searchChanged) { ctrl.pullPage(); }
  });
  $scope.$on('$destroy', function() { ctrl.offLCS(); });

  this.pullPage = function() {
    var query = {
      id: ctrl.roleId,
      page: ctrl.page,
      limit: ctrl.limit,
      search: ctrl.search
    };
    if (ctrl.roleId) {
      AdminRoles.users(query).$promise
      .then(function(updatedUserData) {
        ctrl.processUsers(updatedUserData);
        ctrl.userData = updatedUserData;
        ctrl.pageCount = Math.ceil(updatedUserData.count / query.limit);
      });
    }
  };

}];
