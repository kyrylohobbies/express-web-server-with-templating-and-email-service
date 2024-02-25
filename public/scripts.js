$(document).ready(function() {
    $('.ease-in').fadeIn('slow');
    $('#contact').on('submit', function(event){
        event.preventDefault();
        const preForm = $(this).serializeArray();
        var postForm = {};
        preForm.forEach(formInput => {
            postForm = {...postForm, [formInput.name]: formInput.value }
        });
        $.post('/contact', postForm, function(data){
            if(data==='success'){
                window.location.replace("https://tropic-travels.cyclic.app/thanks");
            }
            if(data==='error'){
                window.location.replace("https://tropic-travels.cyclic.app/error");
            }
        });
    });
    $(window).on('orientationchange resize',function(){
        if ($(window).innerWidth()<=576){
            $('.whitebox').addClass('p-3');
        } else {
            $('.whitebox').removeClass('p-3');
        }
    });

    /* Experimental */

    $('#availability').on('submit', function(event){
        event.preventDefault();
        const preForm = $(this).serializeArray();
        var postForm = {};
        preForm.forEach(formInput => {
            postForm = {...postForm, [formInput.name]: formInput.value }
        });
        console.log(postForm);

        
        $.post('/update', postForm, function(data){
            if(data==='success'){
                console.log('WE HERE');
                window.location.replace("http://localhost:3000/merged");
            }
            if(data==='error'){
                window.location.replace("http://localhost:3000/error");
            }
        });
    });

    $('#login').on('submit', function(event){
        event.preventDefault();
        const loginForm = { [this.password.name]: this.password.value };
        //console.log(loginForm);

        $.post('/login', loginForm, function(data){
            if(data.status==='success'){
                sessionStorage.setItem('token', data.token);
                console.log('WE HERE');
                const path = 'http://localhost:3000/update' + '?token=' + sessionStorage.getItem('token');
                window.location.replace(path);
            }
            if(data.status==='error'){
                window.location.replace("http://localhost:3000/error");
            } 
            
            console.log(sessionStorage.getItem("token"));
            
        });
    });

    /* $.ajax({
        url: '/update',
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer t-7614f875-8423-4f20-a674-d7cf3096290e');
        },
        data: {},
        success: function () { },
        error: function () { },
    }); */
 

});
