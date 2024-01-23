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
                window.location.replace("http://localhost:3000/thanks");
            }
            if(data==='error'){
                window.location.replace("http://localhost:3000/error");
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
});